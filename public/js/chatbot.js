const toggle = document.getElementById("chat-toggle");
const box = document.getElementById("chat-box");
const close = document.getElementById("chat-close");

toggle.onclick = () => {
    box.style.display = "block";
    loadMenu();
};

close.onclick = () => {
    box.style.display = "none";
};

// ===========================
// Load menu
// ===========================

async function loadMenu() {

    const res = await fetch("/chatbot/menu");
    const data = await res.json();

    const options = document.getElementById("chat-options");

    options.innerHTML = "";

    data.options.forEach(item => {

        const button = document.createElement("button");

        button.className = "option-btn";

        button.innerText = item;

        button.onclick = () => handleOption(item);

        options.appendChild(button);

    });

}

// ===========================
// Xử lý khi bấm menu
// ===========================

async function handleOption(option) {

    // Xem phòng
    if (option.includes("Xem phòng")) {

        const res = await fetch("/chatbot/rooms");

        const data = await res.json();

        const rooms = data.rooms;

        const body = document.getElementById("chat-body");

        if (!rooms || rooms.length === 0) {

            body.innerHTML = `
                <div class="bot-message">
                    Không có phòng.
                </div>
            `;
    return;
}

        let html = `
            <div class="bot-message">
                <b>🏨 Danh sách phòng hiện có</b>
                <hr>
        `;

        rooms.forEach(room => {

    html += `
        <div
            style="
                border:1px solid #ddd;
                border-radius:10px;
                padding:10px;
                margin-bottom:10px;
            ">

            <b>${room.name}</b><br>

            Phòng ${room.roomNumber}<br>

            💰 ${Number(room.price).toLocaleString("vi-VN")} đ<br>

            ${room.statusText}<br><br>
    `;

    if (room.available) {

        html += `
            <a
                href="${room.detailUrl}"
                class="btn btn-sm btn-primary">
                Xem chi tiết
            </a>
        `;

    } else {

        html += `
            <button
                class="btn btn-sm btn-secondary"
                disabled>
                Đã có khách
            </button>
        `;

    }

    html += `
        </div>
    `;

});

        html += `
                <button class="option-btn" onclick="loadHome()">
                    ⬅ Quay lại
                </button>
            </div>
        `;

        body.innerHTML = html;

        return;
    }

    // Các nút chưa làm
    // ===========================
// Giá phòng
// ===========================
const body = document.getElementById("chat-body");

if (option.includes("Giá")) {

    const res = await fetch("/chatbot/prices");
    const data = await res.json();

    let html = `
        <div class="bot-message">
            <b>💰 Bảng giá phòng</b>
            <hr>
    `;

    data.rooms.forEach(r => {

        html += `
            <div style="margin-bottom:10px;">
                <b>${r.type}</b><br>
                💰 ${Number(r.price).toLocaleString("vi-VN")} đ / đêm
            </div>
            <hr>
        `;

    });

    html += `
        <button class="option-btn" onclick="loadHome()">
            ⬅ Quay lại
        </button>
        </div>
    `;

    body.innerHTML = html;

    return;
}

// ===========================
// Khuyến mãi
// ===========================

if (option.includes("Khuyến")) {

    const res = await fetch("/chatbot/discounts");
    const data = await res.json();

    let html = `
        <div class="bot-message">
            <b>🎁 Khuyến mãi hiện có</b>
            <hr>
    `;

    if (!data.discounts || data.discounts.length === 0) {

        html += `
            Hiện tại chưa có chương trình khuyến mãi.
        `;

    } else {

        data.discounts.forEach(d => {

            html += `
                <div style="margin-bottom:10px;">
                    🎁 <b>${d.code}</b><br>
                    Giảm <b>${d.percent}%</b>
                </div>
                <hr>
            `;

        });

    }

    html += `
        <button class="option-btn" onclick="loadHome()">
            ⬅ Quay lại
        </button>
        </div>
    `;

    body.innerHTML = html;

    return;
}

// ===========================
// Đặt phòng
// ===========================

if (option.includes("Đặt")) {

    body.innerHTML = `
        <div class="bot-message">

            🏨 Để đặt phòng vui lòng chọn phòng trước.

            <br><br>

            <a href="/search"
                class="btn btn-primary btn-sm">
                Chọn phòng
            </a>

            <br><br>

            <button class="option-btn"
                onclick="loadHome()">
                ⬅ Quay lại
            </button>

        </div>
    `;

    return;
}

// ===========================
// Check-in
// ===========================

if (option.includes("Check")) {

    const res = await fetch("/chatbot/checkin");
    const data = await res.json();

    body.innerHTML = `
        <div class="bot-message">

            🕒 <b>Giờ nhận phòng</b>

            <br><br>

            Check-in:
            <b>${data.checkin}</b>

            <br>

            Check-out:
            <b>${data.checkout}</b>

            <br><br>

            ${data.note}

            <br><br>

            <button class="option-btn"
                onclick="loadHome()">
                ⬅ Quay lại
            </button>

        </div>
    `;

    return;
}

// ===========================
// Liên hệ
// ===========================

if (option.includes("Liên")) {

    const res = await fetch("/chatbot/contact");
    const data = await res.json();

    body.innerHTML = `
        <div class="bot-message">

            📍 ${data.address}

            <br><br>

            ☎ ${data.phone}

            <br><br>

            ✉ ${data.email}

            <br><br>

            <button class="option-btn"
                onclick="loadHome()">
                ⬅ Quay lại
            </button>

        </div>
    `;

    return;
}
}

// ===========================
// Quay lại menu
// ===========================

function loadHome() {

    document.getElementById("chat-body").innerHTML = `
        <div class="bot-message">
            Xin chào 👋<br>
            Tôi có thể giúp gì cho bạn?
        </div>

        <div id="chat-options"></div>
    `;

    loadMenu();

}