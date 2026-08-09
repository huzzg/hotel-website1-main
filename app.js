require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const cookieParser = require('cookie-parser');
const User = require('./models/User'); // ✅ Thêm dòng này để lấy user từ DB
const reviewRoutes = require('./routes/review');
const { attachUser } = require('./middleware/authMiddleware');
const aboutRoutes = require('./routes/about');

const app = express();

// Views & static
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(cookieParser());


// DB connect
try {
  require('./config/db');
} catch (e) {
  console.warn('Không tìm thấy ./config/db — đảm bảo bạn có file config kết nối DB nếu cần.');
}

// Session
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'phenikaa_secret_key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hotel',
      ttl: 24 * 60 * 60,
    }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 },
  })
);
app.use(flash());
app.use(attachUser);

// ✅ Middleware: truyền currentUser cho toàn bộ views
app.use(async (req, res, next) => {
  try {
    if (req.session.user?._id) {
  const user = await User.findById(req.session.user._id)
    .select("username avatar email role profile.name") // 👈 thêm profile.name
    .lean();

  res.locals.currentUser = user;
  req.user = user;
} else {
  res.locals.currentUser = null;
  req.user = null;
}

  } catch (err) {
    console.error("⚠️ Lỗi middleware lấy user:", err);
    res.locals.currentUser = null;
  }
  next();
});


// locals cho views
app.use((req, res, next) => {
  res.locals.currentPath = req.originalUrl || req.path || '/';
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});

// Routes mounts
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/user');
const authRoutes = require('./routes/auth');
const searchRoutes = require('./routes/search');
const paymentRoutes = require('./routes/payment');
const chatbotRoutes = require("./routes/chatbot");


app.use('/review', reviewRoutes);
app.use('/admin', adminRoutes);
app.use('/user', userRoutes);
app.use('/auth', authRoutes);
app.use('/search', searchRoutes);
app.use('/payment', paymentRoutes);
app.use('/about', aboutRoutes);
app.use("/chatbot", chatbotRoutes);

// Models
const Room = require('./models/Room');
const Discount = require('./models/Discount');
const isRoomAvailable = require('./utils/checkRoomAvailability');

// HOME
app.get('/', async (req, res) => {
  try {

    let rooms = await Room.find()
      .sort({ createdAt: -1 })
      .lean();

    const discounts = await Discount.find()
      .sort({ createdAt: 1 })
      .lean();

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    rooms = await Promise.all(

      rooms.map(async (room) => {

        const available = await isRoomAvailable(
          room._id,
          today,
          tomorrow
        );

        return {
          ...room,
          available,
          statusText: available
            ? "🟢 Còn phòng"
            : "🔴 Đã có khách"
        };

      })

    );

    discounts.forEach(dc => {
      const start = dc.startDate ? new Date(dc.startDate) : null;
      const end = dc.endDate ? new Date(dc.endDate) : null;

      dc.isValid =
        dc.active &&
        start &&
        end &&
        today >= start &&
        today <= end;
    });

    res.render("index", {
      title: "Khách sạn Phenikaa",
      rooms,
      discounts
    });

  } catch (err) {

    console.error(err);

    res.status(500).send("Lỗi tải trang chủ");

  }
});


// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack || err.message);
  res.status(500).send('Something went wrong!');
});

app.get('/about', (req, res) => {
  res.render('about', { title: 'Giới thiệu' });
});

// 🛠️ Route hiển thị trang lỗi
app.get("/error", (req, res) => {
  const message = req.query.message || "Đã xảy ra lỗi, vui lòng thử lại sau.";
  const redirectUrl = req.query.redirect || "/auth/login"; // 👈 Thêm dòng này
  res.render("error", { message, redirectUrl }); // 👈 Truyền cả redirectUrl sang EJS
});


// Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server chạy tại http://localhost:${PORT}`));




