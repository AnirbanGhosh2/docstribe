
import pg from "pg";
import 'dotenv/config';
import express from "express";
import bodyParser from "body-parser";

// import "./sql.js";
import multer from 'multer';
// const multer = require('multer');

import axios from 'axios';
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

        const { rows } = await client.query(checkTableQuery, [tableName]);

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
        }
        next();
    }
    catch (error) {
        console.log(error);

    }
};



