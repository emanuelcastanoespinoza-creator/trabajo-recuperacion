// Configuración central. Los secretos se leen del archivo .env (variables de entorno),
// nunca se escriben en el código.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const raiz = path.join(__dirname, '..');

// Si no hay un secreto JWT seguro, la aplicación no debe arrancar.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET falta o tiene menos de 32 caracteres. Copia .env.example a .env y configúralo.');
}

module.exports = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS) || 12,
  loginMaxAttempts: Number(process.env.LOGIN_MAX_ATTEMPTS) || 5,
  dbPath: path.resolve(raiz, process.env.DB_PATH || 'data/securedesk.db'),
  logPath: path.resolve(raiz, process.env.LOG_PATH || 'logs/security.log'),
  backupDir: path.resolve(raiz, process.env.BACKUP_DIR || 'backups'),
};
