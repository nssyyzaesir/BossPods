import express from 'express';

const app = express();

app.get('/', (req, res) => {
  res.send('Servidor Node.js rodando com sucesso, caralho!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porra da porta ${PORT}`);
});
