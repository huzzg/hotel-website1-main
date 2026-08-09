const express = require("express");

const router = express.Router();

const chatbotController = require("../controllers/chatbotController");

router.get("/menu", chatbotController.menu);

router.get("/rooms", chatbotController.rooms);

router.get("/prices", chatbotController.prices);

router.get("/discounts", chatbotController.discounts);

router.get("/contact", chatbotController.contact);

router.get("/checkin", chatbotController.checkin);

module.exports = router;