const express = require("express")
const multer = require("multer");
const handler = require("./handler");
const authenticateToken = require("./middleware");  // Import the middleware

const multerStorage = multer.memoryStorage();
const router = express.Router();
const upload = multer();
const uploadData = multer({storage: multerStorage});


// handler.js mengatur semua route

// Public routes
router.post('/register', upload.none(), handler.registration); // route untuk registrasi
router.post('/login', upload.none(), handler.login); // route untuk login
router.post('/resetpassword', upload.none(), handler.passwordReset); // route untuk reset password pengguna

// Protected routes
router.post('/logout', authenticateToken, handler.logout); // route untuk logout
router.get('/users', authenticateToken, upload.none(), handler.getUsers); // route untuk melihat data semua pengguna
router.get('/users/:uid', authenticateToken, upload.none(), handler.getUserUid); // route untuk melihat data pengguna tertentu berdasarkan UID
router.post('/predict', authenticateToken, upload.none(), handler.predictionStunt);
router.get('/predictionLatest', authenticateToken, upload.none(), handler.getLatestPrediction); // hasil prediksi user sekarang
router.get('/predictionHistory', authenticateToken, upload.none(), handler.getAllPrediction); // riwayat prediksi
router.post('/article', upload.none(), handler.postArticle); // route untuk publish artikel
router.get('/article', handler.getAllArticles); // route untuk mengambil semua artikel
router.get('/article/:uid', handler.getArticleByUID); // route untuk mengambil artikel tertentu berdasarkan UID

module.exports = router;