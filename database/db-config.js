const { initializeApp } = require("firebase/app");
const { getAuth } = require("firebase/auth");
const { getFirestore } = require("firebase/firestore");
const dotenv = require('dotenv');

dotenv.config();

const firebaseConfig = {
    apiKey: "AIzaSyDWjvOlST5vGrl_DSUf0AGkZiWonghED_I",
    authDomain: "healthifynow-db.firebaseapp.com",
    projectId: "healthifynow-db",
    storageBucket: "healthifynow-db.appspot.com",
    messagingSenderId: "476679891323",
    appId: "1:476679891323:web:87ebbd911c695c5d3635de",
    measurementId: "G-C0MNHBDHPT"
  };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

module.exports = {
    auth,
    db
};