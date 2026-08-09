// controllers/chatbotController.js

const Room = require("../models/Room");
const Booking = require("../models/Booking");
const Discount = require("../models/Discount");
const Payment = require("../models/Payment");
const Review = require("../models/Review");

const isRoomAvailable = require("../utils/checkRoomAvailability");

// ============================================================
// HELPER
// ============================================================

function getCurrentUserId(req) {
    return (
        req.session?.user?._id ||
        req.session?.user?.id ||
        req.user?._id ||
        req.user?.id ||
        null
    );
}

function normalizeText(text = "") {
    return String(text)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .trim();
}

function formatPrice(price) {
    return `${Number(price || 0).toLocaleString("vi-VN")} đ`;
}

function formatDate(date) {
    if (!date) return "Chưa xác định";

    return new Date(date).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

function getStatusText(status) {
    const statuses = {
        pending: "🟡 Chờ xác nhận",
        paid: "🔵 Đã thanh toán",
        confirmed: "🔵 Đã xác nhận",
        checked_in: "🟢 Đang thuê",
        checked_out: "⚪ Đã trả phòng",
        cancelled: "🔴 Đã hủy"
    };

    return statuses[status] || status || "Không xác định";
}

function getRoomName(room) {
    return (
        room?.roomName ||
        room?.roomName ||
        room?.name ||
        room?.title ||
        room?.type ||
        `Phòng ${room?.roomNumber || ""}`
    );
}

function getRoomStatus(available) {
    return available
        ? "🟢 Còn phòng"
        : "🔴 Đã có khách";
}

// ============================================================
// KIỂM TRA PHÒNG CÒN TRỐNG
// ============================================================

async function checkRoomAvailability(roomId, checkIn, checkOut) {
    try {
        return await isRoomAvailable(roomId, checkIn, checkOut);
    } catch (err) {
        console.error("❌ Lỗi kiểm tra phòng:", err);
        return false;
    }
}

// ============================================================
// CHUYỂN ROOM THÀNH DỮ LIỆU CHATBOT
// ============================================================

async function serializeRoom(room, checkIn = new Date(), checkOut = null) {
    const start = checkIn ? new Date(checkIn) : new Date();

    const end = checkOut
        ? new Date(checkOut)
        : new Date(start.getTime() + 24 * 60 * 60 * 1000);

    const available = await checkRoomAvailability(
        room._id,
        start,
        end
    );

    return {
        _id: room._id,

        roomNumber: room.roomNumber,

        name: getRoomName(room),

        type: room.type,

        price: Number(room.price || 0),

        priceText: formatPrice(room.price),

        description: room.description || "",

        image: room.image
            ? (
                room.image.startsWith("/")
                    ? room.image
                    : `/${room.image}`
            )
            : "/images/no-room.jpg",

        available,

        statusText: getRoomStatus(available),

        detailUrl: `/user/room/${room._id}`,

        bookingUrl: `/user/booking/${room._id}`
    };
}

// ============================================================
// MENU
// ============================================================

exports.menu = async (req, res) => {
    res.json({
        success: true,

        message:
            "Xin chào 👋 Tôi là trợ lý ảo của Hotel Phenikaa. Tôi có thể giúp gì cho bạn?",

        options: [
            {
                id: "rooms",
                icon: "🏨",
                title: "Xem phòng",
                description: "Xem các phòng hiện có"
            },
            {
                id: "price",
                icon: "💰",
                title: "Giá phòng",
                description: "Xem giá các loại phòng"
            },
            {
                id: "booking",
                icon: "📅",
                title: "Đặt phòng",
                description: "Tìm phòng để đặt"
            },
            {
                id: "my-bookings",
                icon: "🧾",
                title: "Đơn của tôi",
                description: "Xem tình trạng đơn đặt phòng"
            },
            {
                id: "discount",
                icon: "🎁",
                title: "Khuyến mãi",
                description: "Xem mã giảm giá đang hoạt động"
            },
            {
                id: "checkin",
                icon: "🕒",
                title: "Check-in",
                description: "Thông tin nhận và trả phòng"
            },
            {
                id: "contact",
                icon: "📞",
                title: "Liên hệ",
                description: "Thông tin khách sạn"
            }
        ]
    });
};

// ============================================================
// DANH SÁCH PHÒNG
// ============================================================

exports.rooms = async (req, res) => {
    try {
        const rooms = await Room.find({})
            .sort({ price: 1, roomNumber: 1 })
            .lean();

        const result = [];

        for (const room of rooms) {
            result.push(await serializeRoom(room));
        }

        res.json({
            success: true,
            rooms: result
        });

    } catch (err) {
        console.error("❌ Chatbot rooms error:", err);

        res.status(500).json({
            success: false,
            message: "Không thể lấy danh sách phòng."
        });
    }
};

// ============================================================
// CHI TIẾT PHÒNG
// ============================================================

exports.roomDetail = async (req, res) => {
    try {
        const room = await Room.findById(req.params.id).lean();

        if (!room) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy phòng."
            });
        }

        const result = await serializeRoom(room);

        const reviews = await Review.find({
            room: room._id
        })
            .populate("user", "username profile.name avatar")
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        const reviewCount = await Review.countDocuments({
            room: room._id
        });

        const averageRating =
            reviews.length > 0
                ? reviews.reduce(
                    (sum, review) => sum + Number(review.rating || 0),
                    0
                ) / reviews.length
                : 0;

        res.json({
            success: true,

            room: {
                ...result,

                averageRating: Number(averageRating.toFixed(1)),

                reviewCount,

                reviews: reviews.map(review => ({
                    rating: review.rating,

                    comment: review.comment,

                    userName:
                        review.user?.profile?.name ||
                        review.user?.username ||
                        "Khách",

                    avatar:
                        review.user?.avatar ||
                        "/uploads/avatars/default-avatar.jpg",

                    createdAt: formatDate(review.createdAt)
                }))
            }
        });

    } catch (err) {
        console.error("❌ Chatbot room detail error:", err);

        res.status(500).json({
            success: false,
            message: "Không thể lấy thông tin phòng."
        });
    }
};

// ============================================================
// GIÁ PHÒNG
// ============================================================

exports.prices = async (req, res) => {
    try {
        const rooms = await Room.find({})
            .select("roomNumber type name roomName title price")
            .sort({ price: 1 })
            .lean();

        res.json({
            success: true,

            rooms: rooms.map(room => ({
                _id: room._id,

                roomNumber: room.roomNumber,

                name: getRoomName(room),

                type: room.type,

                price: Number(room.price || 0),

                priceText: formatPrice(room.price),

                detailUrl: `/user/room/${room._id}`
            }))
        });

    } catch (err) {
        console.error("❌ Chatbot prices error:", err);

        res.status(500).json({
            success: false,
            message: "Không thể lấy bảng giá."
        });
    }
};

// ============================================================
// KHUYẾN MÃI
// ============================================================

exports.discounts = async (req, res) => {
    try {
        const now = new Date();

        const discounts = await Discount.find({
            active: true,

            $and: [
                {
                    $or: [
                        { startDate: null },
                        { startDate: { $lte: now } }
                    ]
                },
                {
                    $or: [
                        { endDate: null },
                        { endDate: { $gte: now } }
                    ]
                }
            ]
        })
            .sort({ percent: -1 })
            .lean();

        res.json({
            success: true,

            discounts: discounts.map(discount => ({
                _id: discount._id,

                code: discount.code,

                percent: discount.percent,

                text: `Giảm ${discount.percent}%`,

                startDate: discount.startDate
                    ? formatDate(discount.startDate)
                    : "Bắt đầu ngay",

                endDate: discount.endDate
                    ? formatDate(discount.endDate)
                    : "Không giới hạn"
            }))
        });

    } catch (err) {
        console.error("❌ Chatbot discounts error:", err);

        res.status(500).json({
            success: false,
            message: "Không thể lấy thông tin khuyến mãi."
        });
    }
};

// ============================================================
// ĐƠN ĐẶT PHÒNG CỦA USER
// ============================================================

exports.myBookings = async (req, res) => {
    try {
        const userId = getCurrentUserId(req);

        if (!userId) {
            return res.status(401).json({
                success: false,
                authenticated: false,
                message:
                    "Bạn cần đăng nhập để xem đơn đặt phòng."
            });
        }

        const bookings = await Booking.find({
            userId
        })
            .populate(
                "roomId",
                "roomNumber type name roomName title price image description"
            )
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        const bookingIds = bookings.map(
            booking => booking._id
        );

        const payments = bookingIds.length
            ? await Payment.find({
                bookingId: { $in: bookingIds }
            })
                .sort({ createdAt: -1 })
                .lean()
            : [];

        const paymentMap = new Map();

        for (const payment of payments) {
            const key = String(payment.bookingId);

            if (!paymentMap.has(key)) {
                paymentMap.set(key, payment);
            }
        }

        res.json({
            success: true,

            authenticated: true,

            bookings: bookings.map(booking => {
                const payment = paymentMap.get(
                    String(booking._id)
                );

                return {
                    _id: booking._id,

                    room: booking.roomId
                        ? {
                            _id: booking.roomId._id,

                            roomNumber:
                                booking.roomId.roomNumber,

                            name:
                                getRoomName(
                                    booking.roomId
                                ),

                            type:
                                booking.roomId.type,

                            image:
                                booking.roomId.image ||
                                "/images/no-room.jpg"
                        }
                        : null,

                    checkIn:
                        formatDate(booking.checkIn),

                    checkOut:
                        formatDate(booking.checkOut),

                    guests:
                        booking.guests || 1,

                    totalPrice:
                        Number(booking.totalPrice || 0),

                    totalPriceText:
                        formatPrice(
                            booking.totalPrice
                        ),

                    status:
                        booking.status,

                    statusText:
                        getStatusText(
                            booking.status
                        ),

                    isPaid:
                        booking.isPaid === true ||
                        payment?.status === "paid",

                    paymentStatus:
                        payment?.status ||
                        (booking.isPaid
                            ? "paid"
                            : "unpaid"),

                    discountCode:
                        booking.discountCode || null
                };
            })
        });

    } catch (err) {
        console.error(
            "❌ Chatbot my bookings error:",
            err
        );

        res.status(500).json({
            success: false,
            message:
                "Không thể lấy lịch sử đặt phòng."
        });
    }
};

// ============================================================
// ĐƠN ĐẶT PHÒNG CỤ THỂ
// ============================================================

exports.bookingDetail = async (req, res) => {
    try {
        const userId = getCurrentUserId(req);

        if (!userId) {
            return res.status(401).json({
                success: false,
                message:
                    "Bạn cần đăng nhập để xem đơn."
            });
        }

        const booking = await Booking.findOne({
            _id: req.params.id,
            userId
        })
            .populate(
                "roomId",
                "roomNumber type name roomName title price image description"
            )
            .lean();

        if (!booking) {
            return res.status(404).json({
                success: false,
                message:
                    "Không tìm thấy đơn đặt phòng của bạn."
            });
        }

        const payment = await Payment.findOne({
            bookingId: booking._id
        })
            .sort({ createdAt: -1 })
            .lean();

        res.json({
            success: true,

            booking: {
                _id: booking._id,

                room: booking.roomId
                    ? {
                        _id: booking.roomId._id,

                        roomNumber:
                            booking.roomId.roomNumber,

                        name:
                            getRoomName(
                                booking.roomId
                            ),

                        type:
                            booking.roomId.type,

                        price:
                            booking.roomId.price,

                        image:
                            booking.roomId.image ||
                            "/images/no-room.jpg"
                    }
                    : null,

                checkIn:
                    formatDate(booking.checkIn),

                checkOut:
                    formatDate(booking.checkOut),

                guests:
                    booking.guests || 1,

                totalPrice:
                    Number(booking.totalPrice || 0),

                totalPriceText:
                    formatPrice(
                        booking.totalPrice
                    ),

                status:
                    booking.status,

                statusText:
                    getStatusText(
                        booking.status
                    ),

                isPaid:
                    booking.isPaid === true ||
                    payment?.status === "paid",

                paymentStatus:
                    payment?.status ||
                    (booking.isPaid
                        ? "paid"
                        : "unpaid"),

                paymentMethod:
                    payment?.method ||
                    "Chưa thanh toán",

                discountCode:
                    booking.discountCode || null
            }
        });

    } catch (err) {
        console.error(
            "❌ Chatbot booking detail error:",
            err
        );

        res.status(500).json({
            success: false,
            message:
                "Không thể lấy thông tin đơn."
        });
    }
};

// ============================================================
// CHECK-IN / CHECK-OUT
// ============================================================

exports.checkin = async (req, res) => {
    res.json({
        success: true,

        checkin: "14:00",

        checkout: "12:00",

        note:
            "Quý khách vui lòng mang CCCD hoặc hộ chiếu khi nhận phòng."
    });
};

// ============================================================
// LIÊN HỆ
// ============================================================

exports.contact = async (req, res) => {
    res.json({
        success: true,

        address:
            "Đại học Phenikaa, Nguyễn Trác, Hà Đông, Hà Nội",

        phone:
            "0348852758",

        email:
            "hungnguyenviete@gmail.com"
    });
};

// ============================================================
// TÌM PHÒNG THEO CÂU HỎI
// ============================================================

async function findRoomsByQuery(text) {
    const normalized = normalizeText(text);

    let rooms = await Room.find({})
        .sort({ price: 1 })
        .lean();

    // -------------------------
    // Lọc theo số phòng
    // -------------------------

    const roomNumberMatch =
        normalized.match(
            /(?:phong|p)\s*(\d{2,4})/
        );

    if (roomNumberMatch) {
        const roomNumber =
            roomNumberMatch[1];

        rooms = rooms.filter(
            room =>
                String(room.roomNumber) ===
                roomNumber
        );
    }

    // -------------------------
    // Lọc theo loại phòng
    // -------------------------

    const typeKeywords = [
        "single",
        "double",
        "twin",
        "suite",
        "deluxe",
        "standard",
        "family",
        "don",
        "doi",
        "gia dinh",
        "cao cap"
    ];

    const matchedType =
        typeKeywords.find(
            keyword =>
                normalized.includes(keyword)
        );

    if (matchedType) {
        rooms = rooms.filter(room => {
            const roomText = normalizeText(
                `${room.type || ""} ${
                    room.name || ""
                } ${
                    room.roomName || ""
                } ${
                    room.title || ""
                }`
            );

            return roomText.includes(
                matchedType
            );
        });
    }

    // -------------------------
    // Lọc theo giá
    // -------------------------

    const priceMatch =
        normalized.match(
            /(?:duoi|<|toi da|khong qua|nho hon)\s*(\d+(?:[.,]\d+)?)\s*(?:k|nghin|ngan|tr|trieu|vnd|d)?/
        );

    if (priceMatch) {
        let price =
            Number(
                priceMatch[1]
                    .replace(",", ".")
            );

        const unit =
            priceMatch[2];

        if (
            unit === "k" ||
            unit === "nghin" ||
            unit === "ngan"
        ) {
            price *= 1000;
        }

        if (
            unit === "tr" ||
            unit === "trieu"
        ) {
            price *= 1000000;
        }

        rooms = rooms.filter(
            room =>
                Number(room.price || 0) <=
                price
        );
    }

    // -------------------------
    // Kiểm tra còn phòng
    // -------------------------

    const asksAvailable =
        normalized.includes("con phong") ||
        normalized.includes("phong trong") ||
        normalized.includes("con trong") ||
        normalized.includes("available") ||
        normalized.includes("trong phong");

    const result = [];

    for (const room of rooms) {
        const data =
            await serializeRoom(room);

        if (
            asksAvailable &&
            !data.available
        ) {
            continue;
        }

        result.push(data);
    }

    return result;
}

// ============================================================
// LẤY ĐÁNH GIÁ PHÒNG
// ============================================================

async function getRoomReviews(roomId) {
    const reviews = await Review.find({
        room: roomId
    })
        .populate(
            "user",
            "username avatar profile.name"
        )
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

    const average =
        reviews.length
            ? reviews.reduce(
                (sum, review) =>
                    sum +
                    Number(
                        review.rating || 0
                    ),
                0
            ) / reviews.length
            : 0;

    return {
        count: reviews.length,

        average:
            Number(average.toFixed(1)),

        reviews: reviews.map(review => ({
            rating:
                review.rating,

            comment:
                review.comment,

            userName:
                review.user?.profile?.name ||
                review.user?.username ||
                "Khách",

            avatar:
                review.user?.avatar ||
                "/uploads/avatars/default-avatar.jpg",

            createdAt:
                formatDate(
                    review.createdAt
                )
        }))
    };
}

// ============================================================
// CHATBOT HIỂU CÂU HỎI TỰ NHIÊN
// ============================================================

exports.chat = async (req, res) => {
    try {
        const message =
            String(
                req.body?.message || ""
            ).trim();

        if (!message) {
            return res.status(400).json({
                success: false,
                message:
                    "Bạn hãy nhập câu hỏi."
            });
        }

        const text =
            normalizeText(message);

        // ====================================================
        // 1. TÌM PHÒNG
        // ====================================================

        const asksRoom =
            text.includes("phong") &&
            (
                text.includes("con") ||
                text.includes("trong") ||
                text.includes("gia") ||
                text.includes("bao nhieu") ||
                text.includes("duoi") ||
                text.includes("loai") ||
                text.includes("tim")
            );

        if (
            asksRoom ||
            text.includes("phong nao")
        ) {
            const rooms =
                await findRoomsByQuery(
                    message
                );

            if (!rooms.length) {
                return res.json({
                    success: true,

                    intent: "find_rooms",

                    message:
                        "😔 Hiện tại mình không tìm thấy phòng phù hợp với yêu cầu của bạn.",

                    rooms: []
                });
            }

            const availableCount =
                rooms.filter(
                    room =>
                        room.available
                ).length;

            return res.json({
                success: true,

                intent: "find_rooms",

                message:
                    `🏨 Mình tìm thấy ${rooms.length} phòng phù hợp. Có ${availableCount} phòng đang còn trống.`,

                rooms
            });
        }

        // ====================================================
        // 2. PHÒNG CỤ THỂ
        // ====================================================

        const roomNumberMatch =
            text.match(
                /(?:phong|p)\s*(\d{2,4})/
            );

        if (
            roomNumberMatch &&
            (
                text.includes("thong tin") ||
                text.includes("chi tiet") ||
                text.includes("gia") ||
                text.includes("bao nhieu") ||
                text.includes("danh gia")
            )
        ) {
            const roomNumber =
                roomNumberMatch[1];

            const room =
                await Room.findOne({
                    roomNumber
                }).lean();

            if (!room) {
                return res.json({
                    success: true,

                    intent: "room_detail",

                    message:
                        `Mình không tìm thấy phòng ${roomNumber}.`
                });
            }

            const data =
                await serializeRoom(room);

            const reviewData =
                await getRoomReviews(
                    room._id
                );

            return res.json({
                success: true,

                intent: "room_detail",

                message:
                    `🏨 Đây là thông tin phòng ${roomNumber}.`,

                room: {
                    ...data,

                    averageRating:
                        reviewData.average,

                    reviewCount:
                        reviewData.count,

                    reviews:
                        reviewData.reviews
                }
            });
        }

        // ====================================================
        // 3. GIÁ PHÒNG
        // ====================================================

        if (
            text.includes("gia phong") ||
            text.includes("bang gia") ||
            text.includes("phong bao nhieu tien") ||
            text.includes("gia bao nhieu")
        ) {
            const rooms =
                await Room.find({})
                    .select(
                        "roomNumber type name roomName title price"
                    )
                    .sort({
                        price: 1
                    })
                    .lean();

            return res.json({
                success: true,

                intent: "prices",

                message:
                    "💰 Đây là bảng giá phòng hiện tại.",

                rooms:
                    rooms.map(room => ({
                        _id: room._id,

                        roomNumber:
                            room.roomNumber,

                        name:
                            getRoomName(room),

                        type:
                            room.type,

                        price:
                            room.price,

                        priceText:
                            formatPrice(
                                room.price
                            ),

                        detailUrl:
                            `/user/room/${room._id}`
                    }))
            });
        }

        // ====================================================
        // 4. KHUYẾN MÃI
        // ====================================================

        if (
            text.includes("khuyen mai") ||
            text.includes("giam gia") ||
            text.includes("ma giam") ||
            text.includes("voucher") ||
            text.includes("uu dai")
        ) {
            const now =
                new Date();

            const discounts =
                await Discount.find({
                    active: true,

                    $and: [
                        {
                            $or: [
                                {
                                    startDate:
                                        null
                                },
                                {
                                    startDate:
                                        {
                                            $lte:
                                                now
                                        }
                                }
                            ]
                        },
                        {
                            $or: [
                                {
                                    endDate:
                                        null
                                },
                                {
                                    endDate:
                                        {
                                            $gte:
                                                now
                                        }
                                }
                            ]
                        }
                    ]
                })
                    .sort({
                        percent: -1
                    })
                    .lean();

            return res.json({
                success: true,

                intent: "discounts",

                message:
                    discounts.length
                        ? `🎁 Hiện có ${discounts.length} mã giảm giá đang hiệu lực.`
                        : "🎁 Hiện tại chưa có mã giảm giá nào đang hiệu lực.",

                discounts:
                    discounts.map(
                        discount => ({
                            _id:
                                discount._id,

                            code:
                                discount.code,

                            percent:
                                discount.percent,

                            text:
                                `Giảm ${discount.percent}%`,

                            startDate:
                                discount.startDate
                                    ? formatDate(
                                        discount.startDate
                                    )
                                    : "Bắt đầu ngay",

                            endDate:
                                discount.endDate
                                    ? formatDate(
                                        discount.endDate
                                    )
                                    : "Không giới hạn"
                        })
                    )
            });
        }

        // ====================================================
        // 5. ĐƠN ĐẶT PHÒNG
        // ====================================================

        if (
            text.includes("don dat") ||
            text.includes("don cua toi") ||
            text.includes("dat phong cua toi") ||
            text.includes("booking") ||
            text.includes("don phong") ||
            text.includes("lich su dat")
        ) {
            const userId =
                getCurrentUserId(req);

            if (!userId) {
                return res.json({
                    success: true,

                    intent:
                        "my_bookings",

                    authenticated:
                        false,

                    message:
                        "🔐 Bạn cần đăng nhập để mình xem được các đơn đặt phòng của bạn."
                });
            }

            const bookings =
                await Booking.find({
                    userId
                })
                    .populate(
                        "roomId",
                        "roomNumber type name roomName title price image"
                    )
                    .sort({
                        createdAt: -1
                    })
                    .limit(10)
                    .lean();

            if (!bookings.length) {
                return res.json({
                    success: true,

                    intent:
                        "my_bookings",

                    message:
                        "📭 Bạn hiện chưa có đơn đặt phòng nào."
                });
            }

            return res.json({
                success: true,

                intent:
                    "my_bookings",

                message:
                    `🧾 Bạn hiện có ${bookings.length} đơn đặt phòng gần đây.`,

                bookings:
                    bookings.map(
                        booking => ({
                            _id:
                                booking._id,

                            room:
                                booking.roomId
                                    ? {
                                        _id:
                                            booking.roomId._id,

                                        roomNumber:
                                            booking.roomId.roomNumber,

                                        name:
                                            getRoomName(
                                                booking.roomId
                                            ),

                                        image:
                                            booking.roomId.image ||
                                            "/images/no-room.jpg"
                                    }
                                    : null,

                            checkIn:
                                formatDate(
                                    booking.checkIn
                                ),

                            checkOut:
                                formatDate(
                                    booking.checkOut
                                ),

                            guests:
                                booking.guests,

                            totalPrice:
                                booking.totalPrice,

                            totalPriceText:
                                formatPrice(
                                    booking.totalPrice
                                ),

                            status:
                                booking.status,

                            statusText:
                                getStatusText(
                                    booking.status
                                ),

                            isPaid:
                                booking.isPaid
                        })
                    )
            });
        }

        // ====================================================
        // 6. THANH TOÁN
        // ====================================================

        if (
            text.includes("thanh toan") ||
            text.includes("da thanh toan") ||
            text.includes("tra tien") ||
            text.includes("momo")
        ) {
            const userId =
                getCurrentUserId(req);

            if (!userId) {
                return res.json({
                    success: true,

                    intent: "payment",

                    message:
                        "🔐 Bạn cần đăng nhập để mình kiểm tra thông tin thanh toán."
                });
            }

            const bookings =
                await Booking.find({
                    userId
                })
                    .sort({
                        createdAt: -1
                    })
                    .limit(5)
                    .lean();

            const bookingIds =
                bookings.map(
                    booking =>
                        booking._id
                );

            const payments =
                bookingIds.length
                    ? await Payment.find({
                        bookingId: {
                            $in:
                                bookingIds
                        }
                    })
                        .sort({
                            createdAt: -1
                        })
                        .lean()
                    : [];

            return res.json({
                success: true,

                intent: "payment",

                message:
                    "💳 Đây là thông tin thanh toán gần đây của bạn.",

                payments:
                    payments.map(
                        payment => ({
                            _id:
                                payment._id,

                            bookingId:
                                payment.bookingId,

                            amount:
                                payment.amount,

                            amountText:
                                formatPrice(
                                    payment.amount
                                ),

                            method:
                                payment.method,

                            status:
                                payment.status,

                            statusText:
                                payment.status ===
                                "paid"
                                    ? "🟢 Đã thanh toán"
                                    : payment.status ===
                                      "failed"
                                    ? "🔴 Thanh toán thất bại"
                                    : "🟡 Chưa thanh toán",

                            paidAt:
                                payment.paidAt
                                    ? formatDate(
                                        payment.paidAt
                                    )
                                    : null
                        })
                    )
            });
        }

        // ====================================================
        // 7. CHECK-IN
        // ====================================================

        if (
            text.includes("check in") ||
            text.includes("checkin") ||
            text.includes("nhan phong") ||
            text.includes("tra phong") ||
            text.includes("gio nhan phong")
        ) {
            return res.json({
                success: true,

                intent: "checkin",

                message:
                    "🕒 Thông tin nhận và trả phòng:",

                checkin:
                    "14:00",

                checkout:
                    "12:00",

                note:
                    "Quý khách vui lòng mang CCCD hoặc hộ chiếu khi nhận phòng."
            });
        }

        // ====================================================
        // 8. LIÊN HỆ
        // ====================================================

        if (
            text.includes("lien he") ||
            text.includes("so dien thoai") ||
            text.includes("dia chi") ||
            text.includes("email") ||
            text.includes("hotline")
        ) {
            return res.json({
                success: true,

                intent: "contact",

                message:
                    "📞 Đây là thông tin liên hệ của Hotel Phenikaa.",

                address:
                    "Đại học Phenikaa, Nguyễn Trác, Hà Đông, Hà Nội",

                phone:
                    "0348852758",

                email:
                    "hungnguyenviete@gmail.com"
            });
        }

        // ====================================================
        // 9. ĐẶT PHÒNG
        // ====================================================

        if (
            text.includes("dat phong") ||
            text.includes("muon dat") ||
            text.includes("book phong") ||
            text.includes("dat mot phong")
        ) {
            return res.json({
                success: true,

                intent: "booking",

                message:
                    "📅 Bạn có thể chọn phòng phù hợp rồi tiến hành đặt phòng.",

                action: {
                    text:
                        "🔎 Tìm phòng",

                    url:
                        "/search"
                }
            });
        }

        // ====================================================
        // 10. CHÀO HỎI
        // ====================================================

        if (
            text === "xin chao" ||
            text === "chao" ||
            text.includes("hello") ||
            text.includes("hi") ||
            text.includes("alo")
        ) {
            return res.json({
                success: true,

                intent: "greeting",

                message:
                    "Xin chào 👋 Mình là trợ lý ảo của Hotel Phenikaa. Bạn có thể hỏi mình về phòng, giá, khuyến mãi, đơn đặt phòng, thanh toán hoặc giờ check-in."
            });
        }

        // ====================================================
        // 11. TRỢ GIÚP
        // ====================================================

        if (
            text.includes("ban co the lam gi") ||
            text.includes("tro giup") ||
            text.includes("help") ||
            text.includes("giup toi")
        ) {
            return res.json({
                success: true,

                intent: "help",

                message:
                    "🤖 Mình có thể giúp bạn:\n\n" +
                    "🏨 Tìm phòng và kiểm tra phòng còn trống\n" +
                    "💰 Xem giá phòng\n" +
                    "🎁 Kiểm tra khuyến mãi\n" +
                    "📅 Hướng dẫn đặt phòng\n" +
                    "🧾 Xem đơn đặt phòng\n" +
                    "💳 Kiểm tra thanh toán\n" +
                    "🕒 Xem giờ check-in/check-out\n" +
                    "⭐ Xem đánh giá phòng"
            });
        }

        // ====================================================
        // 12. KHÔNG HIỂU
        // ====================================================

        return res.json({
            success: true,

            intent: "unknown",

            message:
                "🤔 Mình chưa hiểu hoàn toàn câu hỏi của bạn.\n\n" +
                "Bạn có thể thử hỏi như:\n\n" +
                "• Phòng nào còn trống?\n" +
                "• Phòng nào dưới 500 nghìn?\n" +
                "• Phòng 201 giá bao nhiêu?\n" +
                "• Có khuyến mãi gì?\n" +
                "• Đơn đặt phòng của tôi thế nào?\n" +
                "• Tôi đã thanh toán chưa?\n" +
                "• Giờ check-in là mấy giờ?"
        });

    } catch (err) {
        console.error(
            "❌ Chatbot chat error:",
            err
        );

        res.status(500).json({
            success: false,

            message:
                "Xin lỗi, chatbot đang gặp sự cố khi xử lý yêu cầu."
        });
    }
};