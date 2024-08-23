import express from "express";
import bodyParser from "body-parser";
import 'dotenv/config';
import pg from "pg";
import multer from 'multer';

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(bodyParser.json());

// Setup Multer
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Database Connection
const db = new pg.Client({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DATABASE,
    password: process.env.POSTGRES_PASSWORD,
    port: process.env.POSTGRES_PORT,
    ssl: {
        rejectUnauthorized: false
    }
});
db.connect().then(() => {
    console.log("Database Connected");
}).catch(err => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// Ensure IP Table Exists
async function ifiptableexist(req, res, next) {
    try {
        const tableName = "ip_table";
        const checkTable = `
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = $1
            );
        `;
        const { rows } = await db.query(checkTable, [tableName]);
        if (!rows[0].exists) {
            console.log(`Table ${tableName} does not exist. Creating it...`);
            const createTableQuery = `
                CREATE TABLE ${tableName} (
                    id SERIAL PRIMARY KEY,
                    doctor_name VARCHAR(255) NOT NULL,
                    surgery_name VARCHAR(255) NOT NULL,
                    patient_name VARCHAR(255) NOT NULL,
                    patient_phone VARCHAR(20) NOT NULL,
                    patient_id VARCHAR(50) NOT NULL,
                    patient_gender VARCHAR(10) NOT NULL,
                    prescriptions BYTEA[] NOT NULL
                );
            `;
            await db.query(createTableQuery);
        }
        next();
    } catch (error) {
        console.error('Error in ifiptableexist:', error);
        res.status(500).send('Server Error');
    }
};

// Ensure OP Table Exists
async function ifoptableexist(req, res, next) {
    try {
        const tableName = "op_table";
        const checkTable = `
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = $1
            );
        `;
        const { rows } = await db.query(checkTable, [tableName]);
        if (!rows[0].exists) {
            console.log(`Table ${tableName} does not exist. Creating it...`);
            const createTableQuery = `
                CREATE TABLE ${tableName} (
                    id SERIAL PRIMARY KEY,
                    doctor_name VARCHAR(255) NOT NULL,
                    diagnostics TEXT,
                    medications TEXT,
                    radiology_interpretation TEXT,
                    next_follow_up_date DATE,
                    prescription BYTEA[] NOT NULL,
                    patient_name VARCHAR(255) NOT NULL,
                    patient_phone VARCHAR(15),
                    patient_id VARCHAR(50) UNIQUE NOT NULL,
                    patient_gender VARCHAR(10) CHECK (patient_gender IN ('Male', 'Female')),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                );
            `;
            await db.query(createTableQuery);
        }
        next();
    } catch (error) {
        console.error('Error in ifoptableexist:', error);
        res.status(500).send('Server Error');
    }
};

// API Endpoints
app.post("/api/op/post", upload.array('prescription', 3), ifoptableexist, async (req, res) => {
    try {
        const buffers = req.files.map(file => file.buffer);
        const { doctorName, surgeryName, patientName, patientPhone, patientId, patientGender } = req.body;
        const insertQuery = `
            INSERT INTO op_table (
                doctor_name, diagnostics, medications, radiology_interpretation, next_follow_up_date, 
                prescription, patient_name, patient_phone, patient_id, patient_gender
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
            )
        `;
        await db.query(insertQuery, [
            doctorName, surgeryName, null, null, null, buffers, patientName, patientPhone, patientId, patientGender
        ]);
        res.status(200).send('Data inserted successfully');
    } catch (error) {
        console.error('Error in /api/op/post:', error);
        res.status(500).send('Server Error');
    }
});

app.post("/api/ip/post", ifiptableexist, upload.array('prescription', 3), async (req, res) => {
    try {
        const buffers = req.files.map(file => file.buffer);
        const { doctorName, surgeryName, patientName, patientPhone, patientId, patientGender } = req.body;
        const insertQuery = `
            INSERT INTO ip_table (
                doctor_name, surgery_name, patient_name, patient_phone, patient_id, patient_gender, prescriptions
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7
            )
        `;
        await db.query(insertQuery, [
            doctorName, surgeryName, patientName, patientPhone, patientId, patientGender, buffers
        ]);
        res.status(200).send('Data inserted successfully');
    } catch (error) {
        console.error('Error in /api/ip/post:', error);
        res.status(500).send('Server Error');
    }
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).send('Server Error');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
