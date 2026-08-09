const express = require("express");

const router = express.Router();

const chatbotController = require("../controllers/chatbotController");

// ============================================================
// MENU
// ============================================================

router.get(
    "/menu",
    chatbotController.menu
);

// ============================================================
// CHAT TỰ NHIÊN
// POST /chatbot/chat
// Body: { message: "phòng nào còn trống?" }
// ============================================================

router.post(
    "/chat",
    chatbotController.chat
);

// ============================================================
// PHÒNG
// ============================================================

// Danh sách phòng
router.get(
    "/rooms",
    chatbotController.rooms
);

// Chi tiết một phòng
router.get(
    "/room/:id",
    chatbotController.roomDetail
);

// ============================================================
// GIÁ PHÒNG
// ============================================================

router.get(
    "/prices",
    chatbotController.prices
);

// ============================================================
// KHUYẾN MÃI
// ============================================================

router.get(
    "/discounts",
    chatbotController.discounts
);

// ============================================================
// ĐƠN ĐẶT PHÒNG
// ============================================================

// Danh sách đơn của user hiện tại
router.get(
    "/bookings",
    chatbotController.myBookings
);

// Chi tiết một đơn của user hiện tại
router.get(
    "/booking/:id",
    chatbotController.bookingDetail
);

// ============================================================
// CHECK-IN / CHECK-OUT
// ============================================================

router.get(
    "/checkin",
    chatbotController.checkin
);

// ============================================================
// LIÊN HỆ
// ============================================================

router.get(
    "/contact",
    chatbotController.contact
);

module.exports = router;