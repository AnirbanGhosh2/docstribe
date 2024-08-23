import express from "express";
import bodyParser from "body-parser";
import 'dotenv/config';
import axios from 'axios';
import pg from "pg";
// import "./sql.js";
import multer from 'multer';
// const multer = require('multer');
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(bodyParser.json());

const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

//// Database Creation
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
const connection = db.connect();
if (connection) {
    console.log("Database Connected");
}
db.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});


async function ifiptableexist(req, res, next) {
    try {
        const tableName = "ip_table";
        const checkTable = `
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE  table_schema = 'public' 
                AND    table_name   = $1
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
    }
    catch (error) {
        console.log(error);

    }
};

async function ifoptableexist(req, res, next) {
    try {
        const tableName = "op_table";
        const checkTable = `
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE  table_schema = 'public' 
                AND    table_name   = $1
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
    }
    catch (error) {
        console.log(error);

    }
};

app.post("/api/op/post", ifoptableexist, async (req, res) => {
    try {
        const buffers = req.files.map(file => file.buffer);
        const { doctorName, surgeryName, patientName, patientPhone, patientId, patientGender } = req.body;
        const insertquery = `INSERT INTO op_table (
        doctor_name,
        diagnostics,
        medications,
        radiology_interpretation,
        next_follow_up_date,
        prescription,
        patient_name,
        patient_phone,
        patient_id,
        patient_gender
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
      )`
        await db.query(insertquery, [doctorName, surgeryName, patientName, patientPhone, patientId, patientGender, buffers])
        console.log(req.path);
    }
    catch (error) {
        console.log(error);
    }
});
app.post("/api/ip/post", ifiptableexist, upload.array('prescription', 3), async (req, res) => {
    const buffers = req.files.map(file => file.buffer);
    const { doctorName, surgeryName, patientName, patientPhone, patientId, patientGender } = req.body;

    console.log(buffers);
    await db.query(`
        INSERT INTO ip_table (doctor_name, surgery_name, patient_name, patient_phone, patient_id, patient_gender, prescriptions)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [doctorName, surgeryName, patientName, patientPhone, patientId, patientGender, buffers]);
});

const port = process.env.PORT
app.use((err, req, res, next) => {
    res.send(err);
})
app.listen(port, () => {
    console.log("Server Is running");
})