const getRouter = require('./routes');
const express = require('express');
const morgan = require('morgan');
const config = require('./config/app');
const taskManager = require('./controllers/task-manager');
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const fs = require('fs');
const path = require('path');
const basicAuth = require('basic-auth');

const server = express();

// Configuración de usuario y contraseña
const auth = {
    username: 'admin',
    password: 'admin124' // Cambia esto por el usuario y contraseña que prefieras
};

// Middleware para autenticación básica
const authMiddleware = (req, res, next) => {
    const user = basicAuth(req);
    if (!user || user.name !== auth.username || user.pass !== auth.password) {
        res.set('WWW-Authenticate', 'Basic realm="Access to the site"');
        return res.status(401).sendFile(path.join(__dirname, './helpers/error.html'));
    }
    next();
};

// Aplicar el middleware de autenticación antes de servir el contenido
server.use(authMiddleware);

server.use(express.json({ limit: '100mb' }));
server.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));
server.use(bodyParser.json({ limit: "50mb" }));
server.use(cookieParser());
server.use(morgan("dev"));
server.use((req, res, next) => {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Credentials", "true");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, tokens");
	res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
	next();
});


// Middleware para servir archivos estáticos
server.use(express.static(__dirname));

// Función para mostrar el contenido de una carpeta
function renderDirectoryContent(folderPath, res) {
    fs.readdir(folderPath, (err, files) => {
        if (err) {
            res.status(500).send('Error al leer el directorio');
            return;
        }

        let html = '<h1>Contenido del directorio</h1><ul>';
        files.forEach(file => {
            const filePath = path.join(folderPath, file);
            const fileStat = fs.statSync(filePath);
            if (fileStat.isDirectory()) {
                html += `<li><a href="${file}/">${file}/</a></li>`;
            } else {
                html += `<li><a href="${file}">${file}</a></li>`;
            }
        });
        html += '</ul>';
        res.send(html);
    });
}

server.use(config.MAIN_PATH, getRouter(express.Router()));

server.get('*', (req, res) => {
    const requestedPath = path.join(__dirname, req.path);

    fs.stat(requestedPath, (err, stats) => {
        if (!err && stats.isFile()) {
            res.sendFile(requestedPath);
        } else if (!err && stats.isDirectory()) {
            const indexPath = path.join(requestedPath, 'index.html');
            if (fs.existsSync(indexPath)) {
                res.sendFile(indexPath);
            } else {
                renderDirectoryContent(requestedPath, res);
            }
        } else {
            res.status(404).send('Archivo o carpeta no encontrado');
        }
    });
});

server.use((err, req, res, next) => {
	const status = err.status || 500;
	const message = err.message || err;
	console.error(err);
	res.status(status).send(message);
});

taskManager.integrate();

module.exports = server;
