const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const bcrypt = require('bcrypt');

const User = require('../models/User');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const Payment = require('../models/Payment');
const Discount = require('../models/Discount');
const userController = require('../controllers/userController');

// =============== MIDDLEWARE: XÁC THỰC NGƯỜI DÙNG ===============
function requireAuth(req, res, next) {
  try {
    const sessionUser = req.session?.user;
    if (sessionUser && sessionUser.id) {
      req.user = sessionUser;
      return next();
    }

    const token = req.cookies?.token;
    if (token) {
      const jwt = require('jsonwebtoken');
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      if (payload && payload.id) {
        req.user = payload;
        return next();
      }
    }
    // ❌ Không có session hoặc token hợp lệ -> chặn
    console.warn("⚠️ Người dùng chưa đăng nhập hoặc phiên đã hết hạn");
    res.clearCookie('connect.sid');
    return res.status(401).render('error', {
  message: 'Bạn cần đăng nhập để đặt phòng.',
  redirectUrl: '/auth/login'
  });
  } catch (err) {
    console.error('Auth error:', err);
    res.clearCookie('connect.sid');
    return res.status(401).render('error', {
  message: 'Bạn cần đăng nhập để đặt phòng.',
  redirectUrl: '/auth/login'
});
  }
}


// =============== CẤU HÌNH MULTER CHO AVATAR ===============
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../public/uploads/avatars');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

// =============== TRANG HỒ SƠ CÁ NHÂN ===============
router.get(['/profile', '/user/profile'], requireAuth, async (req, res) => {
  try {
    const me = await User.findById(req.user.id).lean();
    if (!me) return res.redirect('/auth/login');

    const data = {
      avatar: me.avatar || '/uploads/avatars/default-avatar.jpg',
      name: me.profile?.name || '',
      cccd: me.profile?.cccd || '',
      email: me.email || '',
      phone: me.phone || '',
    };

    res.render('profile', { title: 'Hồ sơ cá nhân', data, success: null, error: null });
  } catch (err) {
    console.error('GET /profile error:', err);
    res.render('profile', { title: 'Hồ sơ cá nhân', data: {}, success: null, error: 'Lỗi tải hồ sơ!' });
  }
});

// =============== CẬP NHẬT HỒ SƠ CÁ NHÂN ===============
router.post(['/profile', '/user/profile'], requireAuth, upload.single('avatar'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.redirect('/auth/login');

    if (!user.profile) user.profile = {};

    const { name, email, phone, cccd } = req.body;

    if (req.file) {
      if (user.avatar && user.avatar !== '/uploads/avatars/default-avatar.jpg') {
        const oldPath = path.join(__dirname, '../public', user.avatar);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      user.avatar = '/uploads/avatars/' + req.file.filename;
    }

    user.profile.name = name || '';
    user.profile.cccd = cccd || '';
    user.email = email || '';
    user.phone = phone || '';

    await user.save();

    // Cập nhật lại session sau khi sửa hồ sơ
req.session.user = {
  ...req.session.user,
  _id: user._id,
  id: user._id,
  username: user.username,
  email: user.email,
  phone: user.phone,
  avatar: user.avatar,
  role: user.role,
  profile: user.profile
};

req.user = req.session.user;

    const data = {
      avatar: user.avatar || '/uploads/avatars/default-avatar.jpg',
      name: user.profile.name,
      cccd: user.profile.cccd,
      email: user.email,
      phone: user.phone,
    };

    res.render('profile', {
      title: 'Hồ sơ cá nhân',
      data,
      success: '✅ Cập nhật hồ sơ thành công!',
      error: null,
    });
  } catch (err) {
    console.error('POST /profile error:', err);
    res.render('profile', {
      title: 'Hồ sơ cá nhân',
      data: {},
      success: null,
      error: '❌ Có lỗi xảy ra khi cập nhật hồ sơ!',
    });
  }
});

// =============== LỊCH SỬ ĐẶT PHÒNG ===============
router.get('/history', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const bookings = await Booking.find({ userId })
      .populate({
        path: "roomId",
        select: "roomNumber type price name image description"
      })
      .sort({ createdAt: -1 })
      .lean();

    res.render('history', { title: 'Lịch sử đặt phòng', bookings, user: req.user });
  } catch (err) {
    console.error('GET /history error:', err);
    res.status(500).send('Lỗi server, thử lại sau.');
  }
});

// =============== ĐẶT PHÒNG ===============
router.get('/booking/:roomId', requireAuth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId).lean();
    if (!room) return res.status(404).send('Không tìm thấy phòng');

    res.render('booking', { title: 'Đặt phòng', room, user: req.user });
  } catch (err) {
    console.error('GET /booking/:roomId error:', err);
    res.status(500).send('Lỗi server');
  }
});

// ✅ Route hiển thị chi tiết phòng
router.get("/room/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;
    const Room = require("../models/Room");
    const Review = require("../models/Review");

    // Lấy thông tin phòng
    const room = await Room.findById(roomId).lean();
    if (!room) {
      return res.status(404).render("error", { message: "Không tìm thấy phòng này" });
    }

    // Lấy các đánh giá liên quan đến phòng đó
    const reviews = await Review.find({ room: roomId })
      .populate("user", "username avatar") // lấy username + avatar người đánh giá
      .sort({ createdAt: -1 })
      .lean();

    res.render("booking", {
      room,
      reviews,
      user: req.session.user, // để header nhận đúng người đăng nhập
    });
  } catch (err) {
    console.error("❌ Lỗi khi hiển thị chi tiết phòng:", err);
    res.status(500).render("error", { message: "Lỗi khi hiển thị chi tiết phòng" });
  }
});

// 🏨 Hiển thị danh sách tất cả phòng (hoặc chỉ phòng trống nếu có query ?available=true)
router.get("/rooms", async (req, res) => {
  try {
    const filter = req.query.available === "true" ? { isBooked: false } : {};
    const rooms = await Room.find(filter).sort({ price: 1 });

    res.render("rooms-list", { rooms });
  } catch (err) {
    console.error("❌ Lỗi tải danh sách phòng:", err);
    res.status(500).send("Đã xảy ra lỗi khi tải danh sách phòng.");
  }
});

// =============== THANH TOÁN ===============
router.post('/payment', requireAuth, async (req, res) => {
  try {
    const { roomId, checkIn, checkOut, totalPrice, discountCode } = req.body;
    const room = await Room.findById(roomId);
    if (!room) return res.status(404).send('Không tìm thấy phòng');

    let discountValue = 0;
    if (discountCode) {
      const discount = await Discount.findOne({ code: discountCode });
      if (discount && discount.active) discountValue = discount.value;
    }

    const finalPrice = totalPrice - discountValue;

    const booking = new Booking({
      userId: req.user.id,
      roomId,
      checkIn,
      checkOut,
      totalPrice: finalPrice
    });

    await booking.save();

    const payment = new Payment({
      bookingId: booking._id,
      userId: req.user.id,
      amount: finalPrice,
      status: 'paid'
    });

    await payment.save();

    res.render('success', {
      title: 'Thanh toán thành công',
      booking,
      payment,
      message: '✅ Cảm ơn bạn đã đặt phòng!'
    });
  } catch (err) {
    console.error('POST /payment error:', err);
    res.status(500).send('Lỗi xử lý thanh toán');
  }
});

// =============== GIẢM GIÁ ===============
router.post('/discount/check', requireAuth, async (req, res) => {
  try {
    const { code } = req.body;
    const discount = await Discount.findOne({ code, active: true });
    if (!discount) return res.json({ valid: false, message: '❌ Mã giảm giá không hợp lệ!' });
    res.json({ valid: true, value: discount.value });
  } catch (err) {
    console.error('POST /discount/check error:', err);
    res.json({ valid: false, message: 'Lỗi kiểm tra mã giảm giá!' });
  }
});


// =============== XỬ LÝ ĐẶT PHÒNG ===============
router.post('/book', requireAuth, async (req, res) => {
  try {
    const { roomId, checkIn, checkOut, guests, discountCode } = req.body;

    // ✅ Lấy thông tin phòng
    const room = await Room.findById(roomId);
    if (!room) return res.status(404).send('Không tìm thấy phòng.');

    // ✅ Tính số đêm ở
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.max(1, Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)));

    // ✅ Tính giá phòng
    const roomPrice = Number(room.price) || 0;
    let discountValue = 0;

    // ✅ Kiểm tra và áp dụng mã giảm giá (nếu có)
    if (discountCode && discountCode.trim() !== "") {
      const discount = await Discount.findOne({ code: discountCode.trim(), active: true });
      if (discount) {
        const now = new Date();
        const start = new Date(discount.startDate);
        const end = new Date(discount.endDate);
        if (now >= start && now <= end) {
          if (discount.percent) {
            discountValue = (roomPrice * nights * discount.percent) / 100;
          } else {
            discountValue = Number(discount.value) || 0;
          }
        }
      }
    }

    // ✅ Tính tổng giá cuối cùng
    const totalPrice = Math.max(roomPrice * nights - discountValue, 0);

    if (isNaN(totalPrice)) {
      console.error("❌ totalPrice bị NaN:", { roomPrice, nights, discountValue });
      return res.status(400).send("Lỗi tính giá tổng. Vui lòng thử lại.");
    }

    // ✅ Tạo booking
    const booking = await Booking.create({
      userId: req.user._id,
      roomId,
      checkIn,
      checkOut,
      guests,
      totalPrice,
      discountCode: discountCode || null,
      status: 'pending'
    });

    res.redirect('/user/history');
  } catch (err) {
    console.error('❌ Lỗi khi đặt phòng:', err);
    res.status(500).send('Lỗi xử lý đặt phòng.');
  }
});



// ✅ Thêm route Giới thiệu (đặt TRƯỚC module.exports)
router.get('/about', (req, res) => {
  res.render('about', { title: 'Giới thiệu' });
});


router.get("/error", (req, res) => {
  const message = req.query.message || "Bạn cần đăng nhập để đặt phòng.";
  const redirectUrl = req.query.redirect || "/auth/login";
  res.render("error", { message, redirectUrl });
});

// ==========================
// ĐÁNH GIÁ PHÒNG
// ==========================
const reviewController = require("../controllers/reviewController");

// Hiển thị trang đánh giá phòng
router.get("/review/:roomId", reviewController.getRoomReviews);

// Gửi đánh giá phòng
router.post("/review/:roomId", reviewController.addReview);

// =============== XÁC NHẬN ĐẶT PHÒNG SAU KHI THANH TOÁN MOMO ===============
router.get('/booking-confirm', async (req, res) => {
  try {
    const { bookingId, status } = req.query;
    if (!bookingId) {
      return res.status(400).render('error', { message: 'Thiếu mã đơn đặt phòng!' });
    }

    const booking = await Booking.findById(bookingId).populate('roomId');
    if (!booking) {
      return res.status(404).render('error', { message: 'Không tìm thấy đơn đặt phòng.' });
    }

    res.render('booking-confirm', {
      title: 'Xác nhận đặt phòng',
      booking,
      status: status || booking.status
    });
  } catch (err) {
    console.error('❌ Lỗi hiển thị xác nhận đặt phòng:', err);
    res.status(500).render('error', { message: 'Lỗi xử lý xác nhận đặt phòng.' });
  }
});

// ==================== GỬI EMAIL XÁC NHẬN ĐẶT PHÒNG ====================
router.post("/send-booking-email", requireAuth, userController.sendBookingEmail);


module.exports = router;





