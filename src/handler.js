const { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    sendPasswordResetEmail
} = require("firebase/auth");
  
const { 
    doc, 
    setDoc, 
    getDocs, 
    getDoc, 
    serverTimestamp, 
    collection,
    query,
    limit,
    orderBy,
    where
} = require('firebase/firestore');
  
// const { 
//     getDownloadURL, 
//     ref, 
//     uploadBytes 
// } = require('firebase/storage');
  
const { db, auth } = require("../database/db-config.js");

const tf = require('@tensorflow/tfjs-node');

const crypto = require('crypto');
  
const { Storage } = require('@google-cloud/storage');

const jwt = require('jsonwebtoken');
  
const dotenv = require("dotenv");
  
const axios = require("axios");

const cheerio = require('cheerio');

let model;
let scaler = null;

// Assuming MODEL_URL and SCALER_URL are environment variables containing the URLs
const modelPath = process.env.MODEL_URL;
const scalerPath = process.env.SCALER_URL;

(async () => {
  try {
    model = await tf.loadLayersModel(modelPath);
    console.log('Model loaded');
  } catch (error) {
    console.error('Error loading model:', error);
  }
})();

// Load the scaler
axios.get(scalerPath)
  .then(response => {
    scaler = response.data;
    console.log('Scaler loaded');
  })
  .catch(error => {
    console.error('Error fetching scaler:', error);
  });

// Function to perform the scaling transformation
function scaleData(data, mean, scale) {
  const meanTensor = tf.tensor1d(mean);
  const scaleTensor = tf.tensor1d(scale);
  return data.sub(meanTensor).div(scaleTensor);
}

const storage = new Storage({
    projectId: process.env.PROJECT_ID,
    keyFilename: "./database/serviceAccount.json",
})

const getUsers = async(req, res) => {
    try {
        const UsersCollection = collection(db, 'users');
        const userSnapshot = await getDocs(UsersCollection);
        const users = [];
    
        userSnapshot.forEach((doc) => {
            const usersData = doc.data();
            users.push({ ...usersData });
        });
    
        res.status(200).json({
            success: true,
            msg: 'Berhasil',
            data: users,
        });
    } catch (error) {
        console.log('Error getting Users:', error);
        res.status(500).json({
            success: false,
            msg: 'Terjadi kesalahan, tunggu beberapa saat',
        });
    }
}

const getUserUid = async (req, res) => {
    const { uid } = req.params;
    try {
        const userDoc = doc(db, 'users', uid);
        const docSnap = await getDoc(userDoc);
        if (docSnap.exists()) {
            const data = docSnap.data();
            res.status(200).json({
                success: true,
                msg: 'Berhasil',
                data
            });
        }
        res.status(404).json({
            success: false,
            msg: 'Users tidak ditemukan',
        });
    } catch (error) {
        console.log('Error mendapatkan data user:', error);
    }
};

const registration = async (req, res) => {
    const { name, email, phone, password } = req.body;

    // Check if all required fields are present
    if (!name || !email || !phone || !password) {
        return res.status(400).json({ success: false, msg: 'Missing required fields' });
    }

    try {
        const accountCredentials = await createUserWithEmailAndPassword(auth, email, password);
        const user = accountCredentials.user;
        const userDoc = doc(db, 'users', user.uid);
        await setDoc(userDoc, {
            name,
            email,
            phone,
            uid: user.uid,
        });
        return res.status(200).json({ success: true, msg: 'Akun berhasil registrasi' });
    } catch (error) {
        console.log('Sign up error:', error);
        if (error.code === 'auth/email-already-in-use') {
            return res.status(400).json({ success: false, msg: 'Email sudah dipakai' });
        }
        return res.status(500).json({ success: false, msg: 'Server error' });
    }
}

const login = async(req, res) => {
  const { email, password } = req.body;
  try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Generate a JWT token
      const token = jwt.sign({ uid: user.uid, email: user.email }, "secretkey", { expiresIn: '1h' });

      res.json({ 
          success: true, 
          msg:'Login berhasil', 
          data: {
              uid: user.uid, 
              email: user.email,
          },
          token // Send token to the client
      });
  } catch (error) {
      res.status(404).json({success: false, msg:'Login tidak berhasil'});
  }
}

const logout = async(req, res) => {
    try {
        await signOut(auth);
        return res.status(200).json({msg: "Logout sukses"});
    } catch (error) {
        console.log('Error melakukan logout:', error);
        return res.status(500).json({msg: "Logout gagal"});
    }
}

const passwordReset = async(req, res) => {
    const { email } = req.body;
    try {
        await sendPasswordResetEmail(auth, email);
        console.log('Link Reset Password telah dikirim ke email:', email);
        return res.status(200).json({msg: "Link Reset Password telah dikirim Ke email"});
    } catch (error) {
        return res.status(200).json({msg: "Reset password gagal"});
    }
}

function generateUID() {
    // Generate a random 16-byte buffer
    const buffer = crypto.randomBytes(16);
    
    // Encode the buffer to base64
    const base64Uid = buffer.toString('base64');
  
    // Remove any characters that are not alphanumeric
    const uid = base64Uid.replace(/[^a-zA-Z0-9]/g, '');
  
    // Take the first 20 characters
    return uid.substring(0, 20);
  }
  
 

const postArticle = async (req, res) => {
    const { imageURL, title, createdBy, content, sourceURL } = req.body;
    const requiredFields = ['imageURL', 'title', 'createdBy', 'content', 'sourceURL'];
    const missingFields = [];
  
    requiredFields.forEach(field => {
      if (!req.body[field]) {
        missingFields.push(field);
      }
    });
  
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        msg: `Penjelasan berikut harus diisi: ${missingFields.join(', ')}`,
      });
    }
  
    try {
      const articleRef = doc(db, 'articles', generateUID());
      await setDoc(articleRef, {
        imageURL,
        title,
        createdBy,
        createdAt: serverTimestamp(),
        content,
        sourceURL,
      });
      res.status(200).json({
        success: true,
        msg: 'Artikel berhasil dipublish',
      });
    } catch (error) {
      console.log('Error posting article:', error);
      res.status(500).json({
        success: false,
        msg: 'Terjadi kesalahan',
      });
    }
  };

  const predictionStunt = async (req, res) => {
    try {
      const { babyName, age, weight, height, gender, breastfeeding } = req.body;
  
      if ([age, weight, height, gender, breastfeeding].some(val => val == null)) {
        return res.status(400).json({ error: 'Invalid input data' });
      }
  
      // Get current user ID
      const currentUserId = auth.currentUser.uid;
  
      // Prepare input data
      const userInput = tf.tensor2d([[gender, age, weight, height, breastfeeding]]);
      const newScaledData = scaleData(userInput, scaler.mean, scaler.scale);
  
      // Make prediction
      const prediction = model.predict(newScaledData).arraySync();
      const predictionsBinary = prediction[0][0] > 0.5 ? 1 : 0; // 1 stunting 0 healthy
  
      const predictionRef = doc(db, 'predictions', generateUID());
      await setDoc(predictionRef, {
        babyName,
        gender,
        age,
        weight,
        createdAt: serverTimestamp(),
        height,
        breastfeeding,
        predictionsBinary,
        userId: currentUserId, // Add user ID to prediction data
      });

      switch(predictionsBinary){
      case 1:
        res.status(200).json({
          prediction: prediction[0],
          predictionsBinary,
          msg: 'Anak anda kemungkinan terkena stunting. Riwayat prediksi berhasil disimpan',
        });
        break;
      case 0:
        res.status(200).json({
          prediction: prediction[0],
          predictionsBinary,
          msg: 'Anak anda sehat. Riwayat prediksi berhasil disimpan',
        });
        break;
      }
    } catch (error) {
      console.log('Error saving history:', error);
      res.status(500).json({
        success: false,
        msg: 'Terjadi kesalahan',
      });
    }
  };
  
  const getLatestPrediction = async (req, res) => {
    try {
      // Check if user is logged in
      if (!auth.currentUser) {
        return res.status(401).json({ success: false, msg: 'You are not logged in' });
      }
  
      const currentUserId = auth.currentUser.uid;
  
      const predictionCollection = collection(db, 'predictions');
      const predictionQuery = query(
        predictionCollection,
        where('userId', '==', currentUserId),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
  
      const predictionSnapshot = await getDocs(predictionQuery);
  
      if (predictionSnapshot.empty) {
        return res.status(404).json({
          success: false,
          msg: 'No predictions found for the current user',
        });
      }
  
      const predictionDoc = predictionSnapshot.docs[0];
      const predictionData = predictionDoc.data();
      const createdAt = predictionData.createdAt.toDate();
      const formattedCreatedAt = createdAt.toLocaleDateString('en-ID', { timeZone: 'Asia/Jakarta' });
  
      const latestPrediction = { id: predictionDoc.id, ...predictionData, createdAt: formattedCreatedAt };
  
      res.status(200).json({
        success: true,
        msg: 'Berhasil',
        data: latestPrediction,
      });
    } catch (error) {
      console.log('Ada kesalahan dalam mendapatkan riwayat prediksi', error);
      res.status(500).json({
        success: false,
        msg: 'Terjadi kesalahan',
      });
    }
  };

  const getAllPrediction = async (req, res) => {
    try {
      // Check if user is logged in
      if (!auth.currentUser) {
        return res.status(401).json({ success: false, msg: 'You are not logged in' });
      }
  
      const currentUserId = auth.currentUser.uid;
  
      const predictionCollection = collection(db, 'predictions');
      const predictionQuery = query(predictionCollection, where('userId', '==', currentUserId), orderBy('createdAt', 'desc'));
      const predictionSnapshot = await getDocs(predictionQuery);
  
      const prediction = [];
  
      predictionSnapshot.forEach((doc) => {
        const predictionData = doc.data();
        const createdAt = predictionData.createdAt.toDate();
        const formattedCreatedAt = createdAt.toLocaleDateString('en-ID', { timeZone: 'Asia/Jakarta' });
        prediction.push({ id: doc.id, ...predictionData, createdAt: formattedCreatedAt });
      });
  
      res.status(200).json({
        success: true,
        msg: 'Berhasil',
        data: prediction,
      });
    } catch (error) {
      console.log('Ada kesalahan dalam mendapatkan riwayat prediksi', error);
      res.status(500).json({
        success: false,
        msg: 'Terjadi kesalahan',
      });
    }
  };
  

  const getAllArticles = async (req, res) => {
    try {
      const articlesCollection = collection(db, 'articles');
      const articlesSnapshot = await getDocs(articlesCollection);
      const articles = [];
  
      articlesSnapshot.forEach((doc) => {
        const articleData = doc.data();
        const createdAt = articleData.createdAt.toDate();
        const formattedCreatedAt = createdAt.toLocaleDateString('en-ID', { timeZone: 'Asia/Jakarta' });
        articles.push({ id: doc.id, ...articleData, createdAt: formattedCreatedAt });
      });
  
      res.status(200).json({
        success: true,
        msg: 'Berhasil',
        data: articles,
      });
    } catch (error) {
      console.log('Ada kesalahan dalam mendapatkan artikel', error);
      res.status(500).json({
        success: false,
        msg: 'Terjadi kesalahan',
      });
    }
  };

  const getArticleByUID = async (req, res) => {
    const { uid } = req.params;
  
    try {
      const article= doc(db, 'articles', uid);
      const articleDoc = await getDoc(article);
  
      if (articleDoc.exists()) {
        const articleData = articleDoc.data();
        const createdAt = articleData.createdAt.toDate();
        const formattedCreatedAt = createdAt.toLocaleDateString('en-ID', { timeZone: 'Asia/Jakarta' });
        
        res.status(200).json({
          success: true,
          msg: 'Berhasil',
          data: {
            ...articleData,
            createdAt: formattedCreatedAt
          },
        });
      } else {
        res.status(404).json({
          success: false,
          msg: 'Artikel tidak ditemukan',
        });
      }
    } catch (error) {
      console.log('Error getting article:', error);
      res.status(500).json({
        success: false,
        msg: 'Terjadi kesalahan, tunggu beberapa saat',
      });
    }
  };

module.exports = {
    registration,
    login,
    logout,
    passwordReset,
    getUsers,
    getUserUid,
    postArticle,
    getAllArticles,
    getArticleByUID,
    predictionStunt,
    getAllPrediction,
    getLatestPrediction,
    // getStuntingArticles
};
