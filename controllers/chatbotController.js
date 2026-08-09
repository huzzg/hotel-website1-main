const Room = require("../models/Room");
const Discount = require("../models/Discount");
const isRoomAvailable = require("../utils/checkRoomAvailability");

// ================= MENU =================

exports.menu = async (req, res) => {

    res.json({
        success: true,
        message: "Xin chào 👋",
        options: [
            "🏨 Xem phòng",
            "💰 Giá phòng",
            "🎁 Khuyến mãi",
            "📅 Đặt phòng",
            "🕒 Check-in",
            "📞 Liên hệ"
        ]
    });

};

// ================= ROOMS =================

exports.rooms = async (req, res) => {

    try {

        const rooms = await Room.find({})
            .sort({ roomNumber: 1 })
            .lean();

        const today = new Date();

        const tomorrow = new Date();

        tomorrow.setDate(today.getDate() + 1);

        const result = [];

        for (const room of rooms) {

            const available = await isRoomAvailable(
                room._id,
                today,
                tomorrow
            );

            result.push({

                _id: room._id,

                roomNumber: room.roomNumber,

                name:
                    room.roomName ||
                    room.name ||
                    room.type,

                type: room.type,

                description: room.description || "",

                image: room.image
                    ? (room.image.startsWith("/")
                        ? room.image
                        : "/" + room.image)
                    : "/images/no-room.jpg",

                price: room.price,

                available,

                statusText: available
                    ? "🟢 Còn phòng"
                    : "🔴 Đã có khách",

                detailUrl: `/user/room/${room._id}`,

                bookingUrl: `/user/room/${room._id}`

            });

        }

        res.json({
            success: true,
            rooms: result
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({

            success: false,

            message: "Không lấy được danh sách phòng."

        });

    }

};

// ================= PRICE =================

exports.prices = async (req, res) => {

    try {

        const rooms = await Room.find({})
            .select("type price roomNumber")
            .sort({ price: 1 })
            .lean();

        res.json({

            success: true,

            rooms

        });

    } catch (err) {

        res.status(500).json({

            success: false

        });

    }

};

// ================= DISCOUNTS =================

exports.discounts = async (req, res) => {

    try {

        const discounts = await Discount.find({
            active: true
        }).lean();

        res.json({

            success: true,

            discounts

        });

    } catch (err) {

        res.status(500).json({

            success: false

        });

    }

};

// ================= CONTACT =================

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

// ================= CHECKIN =================

exports.checkin = async (req, res) => {

    res.json({

        success: true,

        checkin: "14:00",

        checkout: "12:00",

        note:
            "Quý khách vui lòng mang CCCD hoặc hộ chiếu khi nhận phòng."

    });

};