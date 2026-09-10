const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'Token no proporcionado' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu_secreto_super_seguro_aqui_2024');
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Error verificando token:', error);
        res.status(401).json({ error: 'Token inválido' });
    }
};

module.exports = verifyToken;