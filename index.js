import express from 'express';
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Firebase SDK - caralho
try {
  const firebaseConfigJson = process.env.FIREBASE_ADMIN_SDK;

  if (!firebaseConfigJson) throw new Error("FIREBASE_ADMIN_SDK tá vazia, porra!");

  const serviceAccount = JSON.parse(firebaseConfigJson);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  console.log('Firebase inicializado na voadora, caralho!');
} catch (err) {
  console.error('Erro ao inicializar Firebase:', err.message);
}