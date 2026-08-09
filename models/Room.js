const mongoose = require("mongoose");

const RoomSchema = new mongoose.Schema(
{
    roomNumber: { type: String, required: true },
    name: { type: String },
    roomName: { type: String },
    title: { type: String },

    type: { type: String, required: true },

    price: {
        type: Number,
        default: 0
    },

    status: {
        type: String,
        default: "available"
    },

    image: String,

    description: {
        type: String,
        default: ""
    }

},
{
    timestamps: true
});

module.exports = mongoose.model("Room", RoomSchema);