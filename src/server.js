// Punto de entrada: arranca el servidor.
const config = require('./config');
const app = require('./app');

app.listen(config.port, () => {
  console.log(`SecureDesk ADSO escuchando en http://localhost:${config.port}`);
});
