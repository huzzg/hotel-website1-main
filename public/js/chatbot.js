// =========================================================
// HOTEL PHENIKAA CHATBOT
// =========================================================

document.addEventListener("DOMContentLoaded", () => {

    const toggle = document.getElementById("chat-toggle");
    const box = document.getElementById("chat-box");
    const close = document.getElementById("chat-close");

    const body = document.getElementById("chat-body");
    const options = document.getElementById("chat-options");
    const messages = document.getElementById("chat-messages");

    const input = document.getElementById("chat-input");
    const send = document.getElementById("chat-send");

    const typing = document.getElementById("chat-typing");

    if (!toggle || !box) {
        console.warn("⚠️ Không tìm thấy chatbot.");
        return;
    }

    let menuLoaded = false;
    let sending = false;


    // =====================================================
    // MỞ CHATBOT
    // =====================================================

    toggle.addEventListener("click", () => {

        box.style.display = "flex";

        box.setAttribute(
            "aria-hidden",
            "false"
        );

        if (!menuLoaded) {
            loadMenu();
        }

        setTimeout(() => {
            input?.focus();
        }, 100);
    });


    // =====================================================
    // ĐÓNG CHATBOT
    // =====================================================

    close?.addEventListener("click", () => {

        box.style.display = "none";

        box.setAttribute(
            "aria-hidden",
            "true"
        );
    });


    // =====================================================
    // ENTER ĐỂ GỬI
    // =====================================================

    input?.addEventListener("keydown", event => {

        if (event.key === "Enter") {

            event.preventDefault();

            sendMessage();
        }
    });


    // =====================================================
    // CLICK GỬI
    // =====================================================

    send?.addEventListener(
        "click",
        sendMessage
    );


    // =====================================================
    // LOAD MENU
    // =====================================================

    async function loadMenu() {

        try {

            const response =
                await fetch("/chatbot/menu");

            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status}`
                );
            }

            const data =
                await response.json();

            renderMenu(
                data.options || []
            );

            menuLoaded = true;

        } catch (error) {

            console.error(
                "❌ Load chatbot menu:",
                error
            );

            options.innerHTML = `
                <div class="bot-message">
                    Không thể tải menu chatbot.
                    Vui lòng thử lại sau.
                </div>
            `;
        }
    }


    // =====================================================
    // RENDER MENU
    // =====================================================

    function renderMenu(items) {

        options.innerHTML = "";

        items.forEach(item => {

            const button =
                document.createElement("button");

            button.type = "button";

            button.className =
                "option-btn";

            button.innerHTML = `
                <span class="option-icon">
                    ${escapeHtml(item.icon || "💬")}
                </span>

                <span class="option-title">
                    ${escapeHtml(item.title || "")}
                </span>

                <span class="option-description">
                    ${escapeHtml(
                        item.description || ""
                    )}
                </span>
            `;

            button.addEventListener(
                "click",
                () => handleMenuOption(item.id)
            );

            options.appendChild(button);
        });
    }


    // =====================================================
    // XỬ LÝ MENU
    // =====================================================

    async function handleMenuOption(id) {

        switch (id) {

            case "rooms":
                await loadRooms();
                break;

            case "price":
                await loadPrices();
                break;

            case "booking":
                showBookingGuide();
                break;

            case "my-bookings":
                await loadMyBookings();
                break;

            case "discount":
                await loadDiscounts();
                break;

            case "checkin":
                await loadCheckin();
                break;

            case "contact":
                await loadContact();
                break;

            default:
                showBotMessage(
                    "Mình chưa có thông tin cho mục này."
                );
        }
    }


    // =====================================================
    // GỬI CÂU HỎI
    // =====================================================

    async function sendMessage() {

        if (sending) {
            return;
        }

        const message =
            input?.value.trim();

        if (!message) {
            return;
        }

        addUserMessage(message);

        input.value = "";

        sending = true;

        if (send) {
            send.disabled = true;
        }

        showTyping();

        try {

            const response =
                await fetch(
                    "/chatbot/chat",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            message
                        })
                    }
                );

            const data =
                await response.json();

            hideTyping();

            if (!response.ok) {

                showBotMessage(
                    data.message ||
                    "Có lỗi xảy ra khi xử lý câu hỏi."
                );

                return;
            }

            renderChatResponse(data);

        } catch (error) {

            console.error(
                "❌ Chatbot error:",
                error
            );

            hideTyping();

            showBotMessage(
                "⚠️ Không thể kết nối với chatbot. Vui lòng thử lại."
            );

        } finally {

            sending = false;

            if (send) {
                send.disabled = false;
            }

            input?.focus();
        }
    }


    // =====================================================
    // RENDER RESPONSE
    // =====================================================

    function renderChatResponse(data) {

        if (data.message) {
            showBotMessage(
                data.message
            );
        }


        // -----------------------------------------------
        // PHÒNG
        // -----------------------------------------------

        if (
            data.intent === "find_rooms" &&
            Array.isArray(data.rooms)
        ) {

            renderRoomList(
                data.rooms
            );

            return;
        }


        // -----------------------------------------------
        // CHI TIẾT PHÒNG
        // -----------------------------------------------

        if (
            data.intent === "room_detail" &&
            data.room
        ) {

            renderRoomDetail(
                data.room
            );

            return;
        }


        // -----------------------------------------------
        // GIÁ
        // -----------------------------------------------

        if (
            data.intent === "prices" &&
            Array.isArray(data.rooms)
        ) {

            renderPriceList(
                data.rooms
            );

            return;
        }


        // -----------------------------------------------
        // KHUYẾN MÃI
        // -----------------------------------------------

        if (
            data.intent === "discounts" &&
            Array.isArray(data.discounts)
        ) {

            renderDiscountList(
                data.discounts
            );

            return;
        }


        // -----------------------------------------------
        // BOOKING
        // -----------------------------------------------

        if (
            data.intent === "my_bookings" &&
            Array.isArray(data.bookings)
        ) {

            renderBookingList(
                data.bookings
            );

            return;
        }


        // -----------------------------------------------
        // PAYMENT
        // -----------------------------------------------

        if (
            data.intent === "payment" &&
            Array.isArray(data.payments)
        ) {

            renderPaymentList(
                data.payments
            );

            return;
        }


        // -----------------------------------------------
        // CHECK-IN
        // -----------------------------------------------

        if (
            data.intent === "checkin"
        ) {

            renderCheckin(
                data
            );

            return;
        }


        // -----------------------------------------------
        // CONTACT
        // -----------------------------------------------

        if (
            data.intent === "contact"
        ) {

            renderContact(
                data
            );

            return;
        }


        // -----------------------------------------------
        // BOOKING GUIDE
        // -----------------------------------------------

        if (
            data.intent === "booking" &&
            data.action
        ) {

            addActionButton(
                data.action.text,
                data.action.url
            );
        }
    }


    // =====================================================
    // LOAD ROOMS
    // =====================================================

    async function loadRooms() {

        showTyping();

        try {

            const response =
                await fetch(
                    "/chatbot/rooms"
                );

            const data =
                await response.json();

            hideTyping();

            if (
                !data.success ||
                !Array.isArray(data.rooms)
            ) {

                showBotMessage(
                    "Không thể lấy danh sách phòng."
                );

                return;
            }

            showBotMessage(
                "🏨 Đây là các phòng hiện có trong hệ thống:"
            );

            renderRoomList(
                data.rooms
            );

        } catch (error) {

            hideTyping();

            console.error(error);

            showBotMessage(
                "Không thể tải danh sách phòng."
            );
        }
    }


    // =====================================================
    // ROOM LIST
    // =====================================================

    function renderRoomList(rooms) {

        if (!rooms.length) {

            showBotMessage(
                "😔 Hiện tại không có phòng phù hợp."
            );

            return;
        }

        rooms.forEach(room => {

            const wrapper =
                document.createElement("div");

            wrapper.className =
                "chat-room-card";

            const image =
                escapeHtml(
                    room.image ||
                    "/images/no-room.jpg"
                );

            const name =
                escapeHtml(
                    room.name ||
                    `Phòng ${room.roomNumber}`
                );

            const number =
                escapeHtml(
                    String(
                        room.roomNumber || ""
                    )
                );

            const price =
                escapeHtml(
                    room.priceText ||
                    formatPrice(room.price)
                );

            const status =
                escapeHtml(
                    room.statusText ||
                    ""
                );

            wrapper.innerHTML = `
                <img
                    src="${image}"
                    class="chat-room-image"
                    alt="${name}"
                    onerror="
                        this.src='/images/no-room.jpg'
                    "
                >

                <div class="chat-room-content">

                    <div class="chat-room-name">
                        ${name}
                    </div>

                    <div class="chat-room-number">
                        🛏️ Phòng ${number}
                    </div>

                    <div class="chat-room-price">
                        💰 ${price} / đêm
                    </div>

                    <div class="chat-room-status">
                        ${status}
                    </div>

                    <div class="chat-room-actions">

                        ${
                            room.available
                                ? `
                                    <a
                                        href="${escapeAttribute(
                                            room.detailUrl
                                        )}"
                                        class="
                                            chat-action-btn
                                            chat-action-primary
                                        "
                                    >
                                        Xem chi tiết
                                    </a>
                                `
                                : `
                                    <button
                                        type="button"
                                        class="
                                            chat-action-btn
                                            chat-action-disabled
                                        "
                                        disabled
                                    >
                                        🔒 Đã có khách
                                    </button>
                                `
                        }

                    </div>

                </div>
            `;

            messages.appendChild(
                wrapper
            );
        });

        scrollToBottom();
    }


    // =====================================================
    // ROOM DETAIL
    // =====================================================

    function renderRoomDetail(room) {

        const wrapper =
            document.createElement("div");

        wrapper.className =
            "chat-room-card";

        const image =
            escapeHtml(
                room.image ||
                "/images/no-room.jpg"
            );

        const name =
            escapeHtml(
                room.name ||
                `Phòng ${room.roomNumber}`
            );

        const description =
            escapeHtml(
                room.description ||
                "Chưa có mô tả."
            );

        const rating =
            room.averageRating
                ? `⭐ ${room.averageRating}/5`
                : "⭐ Chưa có đánh giá";

        wrapper.innerHTML = `
            <img
                src="${image}"
                class="chat-room-image"
                alt="${name}"
                onerror="
                    this.src='/images/no-room.jpg'
                "
            >

            <div class="chat-room-content">

                <div class="chat-room-name">
                    ${name}
                </div>

                <div class="chat-room-number">
                    🛏️ Phòng ${escapeHtml(
                        String(
                            room.roomNumber || ""
                        )
                    )}
                </div>

                <div class="chat-room-price">
                    💰 ${escapeHtml(
                        room.priceText ||
                        formatPrice(room.price)
                    )} / đêm
                </div>

                <div class="chat-room-status">
                    ${escapeHtml(
                        room.statusText || ""
                    )}
                </div>

                <div style="
                    margin-bottom:8px;
                    color:#68737d;
                    font-size:12px;
                ">
                    ${description}
                </div>

                <div style="
                    margin-bottom:9px;
                    font-size:12px;
                ">
                    ${rating}
                    ${
                        room.reviewCount
                            ? `
                                · ${
                                    room.reviewCount
                                } đánh giá
                            `
                            : ""
                    }
                </div>

                <div class="chat-room-actions">

                    ${
                        room.available
                            ? `
                                <a
                                    href="${escapeAttribute(
                                        room.detailUrl
                                    )}"
                                    class="
                                        chat-action-btn
                                        chat-action-primary
                                    "
                                >
                                    Xem chi tiết
                                </a>
                            `
                            : `
                                <button
                                    type="button"
                                    class="
                                        chat-action-btn
                                        chat-action-disabled
                                    "
                                    disabled
                                >
                                    🔒 Đã có khách
                                </button>
                            `
                    }

                </div>

            </div>
        `;

        messages.appendChild(
            wrapper
        );

        scrollToBottom();
    }


    // =====================================================
    // PRICE LIST
    // =====================================================

    function renderPriceList(rooms) {
    const priceByType = {};

    rooms.forEach(room => {
        const type = room.type || room.name;

        if (!type) return;

        if (!priceByType[type]) {
            priceByType[type] =
                room.priceText ||
                formatPrice(room.price);
        }
    });

    const preferredTypes = [
        "Standard",
        "Superior",
        "Deluxe",
        "Suite"
    ];

    let html = `
        <div class="chat-price-list">

            <div class="chat-price-title">
                💰 Giá phòng
            </div>
    `;

    preferredTypes.forEach(type => {
        if (!priceByType[type]) return;

        html += `
            <div class="chat-price-item">

                <div class="chat-price-type">
                    🛏️ ${escapeHtml(type)}
                </div>

                <div class="chat-price-value">
                    ${escapeHtml(
                        priceByType[type]
                    )} / đêm
                </div>

            </div>
        `;
    });

    html += `
        </div>
    `;

    messages.insertAdjacentHTML(
        "beforeend",
        html
    );

    scrollToBottom();
}

    // =====================================================
    // DISCOUNT LIST
    // =====================================================

    function renderDiscountList(discounts) {

        if (!discounts.length) {
            return;
        }

        discounts.forEach(discount => {

            const card =
                document.createElement("div");

            card.className =
                "chat-discount-card";

            card.innerHTML = `
                <div class="chat-discount-code">
                    🎁 ${escapeHtml(
                        discount.code
                    )}
                </div>

                <div class="chat-discount-percent">
                    Giảm ${
                        escapeHtml(
                            String(
                                discount.percent
                            )
                        )
                    }%
                </div>

                <div class="chat-discount-date">
                    📅 ${
                        escapeHtml(
                            discount.startDate ||
                            ""
                        )
                    }
                    →
                    ${
                        escapeHtml(
                            discount.endDate ||
                            ""
                        )
                    }
                </div>
            `;

            messages.appendChild(
                card
            );
        });

        scrollToBottom();
    }


    // =====================================================
    // BOOKING LIST
    // =====================================================

    function renderBookingList(bookings) {

        if (!bookings.length) {
            return;
        }

        bookings.forEach(booking => {

            const card =
                document.createElement("div");

            card.className =
                "chat-booking-card";

            const room =
                booking.room;

            const roomName =
                room
                    ? `Phòng ${room.roomNumber}`
                    : "Phòng không xác định";

            const image =
                room?.image ||
                "/images/no-room.jpg";

            card.innerHTML = `

                ${
                    room
                        ? `
                            <img
                                src="${escapeAttribute(
                                    image
                                )}"
                                alt="${escapeAttribute(
                                    roomName
                                )}"
                                style="
                                    width:100%;
                                    height:100px;
                                    object-fit:cover;
                                    border-radius:9px;
                                    margin-bottom:8px;
                                "
                                onerror="
                                    this.src='/images/no-room.jpg'
                                "
                            >
                        `
                        : ""
                }

                <div class="chat-booking-header">

                    <div class="chat-booking-room">
                        🏨 ${
                            escapeHtml(
                                roomName
                            )
                        }
                    </div>

                    <div class="chat-booking-status">
                        ${
                            escapeHtml(
                                booking.statusText ||
                                ""
                            )
                        }
                    </div>

                </div>

                <div class="chat-booking-info">

                    📅 Check-in:
                    <b>
                        ${
                            escapeHtml(
                                booking.checkIn ||
                                ""
                            )
                        }
                    </b>

                    <br>

                    📅 Check-out:
                    <b>
                        ${
                            escapeHtml(
                                booking.checkOut ||
                                ""
                            )
                        }
                    </b>

                    <br>

                    👥 Số khách:
                    ${
                        escapeHtml(
                            String(
                                booking.guests ||
                                1
                            )
                        )
                    }

                    <div class="chat-booking-price">
                        💰 ${
                            escapeHtml(
                                booking.totalPriceText ||
                                formatPrice(
                                    booking.totalPrice
                                )
                            )
                        }
                    </div>

                </div>

            `;

            messages.appendChild(
                card
            );
        });

        scrollToBottom();
    }


    // =====================================================
    // PAYMENT LIST
    // =====================================================

    function renderPaymentList(payments) {

        if (!payments.length) {

            showBotMessage(
                "💳 Bạn chưa có thông tin thanh toán gần đây."
            );

            return;
        }

        payments.forEach(payment => {

            const card =
                document.createElement("div");

            card.className =
                "chat-booking-card";

            card.innerHTML = `

                <div class="chat-booking-header">

                    <div class="chat-booking-room">
                        💳 Thanh toán
                    </div>

                    <div class="chat-booking-status">
                        ${
                            escapeHtml(
                                payment.statusText ||
                                ""
                            )
                        }
                    </div>

                </div>

                <div class="chat-booking-info">

                    💰 Số tiền:
                    <b>
                        ${
                            escapeHtml(
                                payment.amountText ||
                                formatPrice(
                                    payment.amount
                                )
                            )
                        }
                    </b>

                    <br>

                    💳 Phương thức:
                    ${
                        escapeHtml(
                            payment.method ||
                            "Chưa xác định"
                        )
                    }

                    ${
                        payment.paidAt
                            ? `
                                <br>
                                🕒 Thanh toán:
                                ${
                                    escapeHtml(
                                        payment.paidAt
                                    )
                                }
                            `
                            : ""
                    }

                </div>
            `;

            messages.appendChild(
                card
            );
        });

        scrollToBottom();
    }


    // =====================================================
    // CHECK-IN
    // =====================================================

    function renderCheckin(data) {

        const card =
            document.createElement("div");

        card.className =
            "bot-message";

        card.innerHTML = `

            <b>🕒 Thời gian nhận/trả phòng</b>

            <br><br>

            🟢 Check-in:
            <b>
                ${escapeHtml(
                    data.checkin || "14:00"
                )}
            </b>

            <br>

            🔴 Check-out:
            <b>
                ${escapeHtml(
                    data.checkout || "12:00"
                )}
            </b>

            <br><br>

            ${escapeHtml(
                data.note || ""
            )}
        `;

        messages.appendChild(
            card
        );

        scrollToBottom();
    }


    // =====================================================
    // CONTACT
    // =====================================================

    function renderContact(data) {

        const card =
            document.createElement("div");

        card.className =
            "bot-message";

        card.innerHTML = `

            <b>📞 Thông tin liên hệ</b>

            <br><br>

            📍 ${
                escapeHtml(
                    data.address || ""
                )
            }

            <br><br>

            ☎ ${
                escapeHtml(
                    data.phone || ""
                )
            }

            <br><br>

            ✉ ${
                escapeHtml(
                    data.email || ""
                )
            }
        `;

        messages.appendChild(
            card
        );

        scrollToBottom();
    }


    // =====================================================
    // BOOKING GUIDE
    // =====================================================

    function showBookingGuide() {

        showBotMessage(
            "📅 Bạn có thể tìm phòng phù hợp rồi chọn phòng để tiến hành đặt."
        );

        addActionButton(
            "🔎 Tìm phòng",
            "/search"
        );
    }


    // =====================================================
    // LOAD MY BOOKINGS
    // =====================================================

    async function loadMyBookings() {

        showTyping();

        try {

            const response =
                await fetch(
                    "/chatbot/bookings"
                );

            const data =
                await response.json();

            hideTyping();

            if (
                response.status === 401 ||
                data.authenticated === false
            ) {

                showBotMessage(
                    data.message ||
                    "🔐 Bạn cần đăng nhập để xem đơn."
                );

                return;
            }

            if (
                !data.success
            ) {

                showBotMessage(
                    data.message ||
                    "Không thể lấy đơn đặt phòng."
                );

                return;
            }

            showBotMessage(
                data.message ||
                "🧾 Đây là các đơn đặt phòng của bạn."
            );

            renderBookingList(
                data.bookings || []
            );

        } catch (error) {

            hideTyping();

            console.error(error);

            showBotMessage(
                "Không thể tải đơn đặt phòng."
            );
        }
    }


    // =====================================================
    // LOAD PRICES
    // =====================================================

    async function loadPrices() {

        showTyping();

        try {

            const response =
                await fetch(
                    "/chatbot/prices"
                );

            const data =
                await response.json();

            hideTyping();

            if (
                !data.success
            ) {

                showBotMessage(
                    "Không thể lấy bảng giá."
                );

                return;
            }

            showBotMessage(
                "💰 Đây là bảng giá hiện tại:"
            );

            renderPriceList(
                data.rooms || []
            );

        } catch (error) {

            hideTyping();

            console.error(error);

            showBotMessage(
                "Không thể tải bảng giá."
            );
        }
    }


    // =====================================================
    // LOAD DISCOUNTS
    // =====================================================

    async function loadDiscounts() {

        showTyping();

        try {

            const response =
                await fetch(
                    "/chatbot/discounts"
                );

            const data =
                await response.json();

            hideTyping();

            if (
                !data.success
            ) {

                showBotMessage(
                    "Không thể lấy khuyến mãi."
                );

                return;
            }

            showBotMessage(
                data.discounts?.length
                    ? "🎁 Các khuyến mãi đang hiệu lực:"
                    : "🎁 Hiện chưa có khuyến mãi."
            );

            renderDiscountList(
                data.discounts || []
            );

        } catch (error) {

            hideTyping();

            console.error(error);

            showBotMessage(
                "Không thể tải khuyến mãi."
            );
        }
    }


    // =====================================================
    // LOAD CHECK-IN
    // =====================================================

    async function loadCheckin() {

        showTyping();

        try {

            const response =
                await fetch(
                    "/chatbot/checkin"
                );

            const data =
                await response.json();

            hideTyping();

            renderChatResponse({
                intent: "checkin",

                ...data
            });

        } catch (error) {

            hideTyping();

            console.error(error);

            showBotMessage(
                "Không thể tải thông tin check-in."
            );
        }
    }


    // =====================================================
    // LOAD CONTACT
    // =====================================================

    async function loadContact() {

        showTyping();

        try {

            const response =
                await fetch(
                    "/chatbot/contact"
                );

            const data =
                await response.json();

            hideTyping();

            renderChatResponse({
                intent: "contact",

                ...data
            });

        } catch (error) {

            hideTyping();

            console.error(error);

            showBotMessage(
                "Không thể tải thông tin liên hệ."
            );
        }
    }


    // =====================================================
    // MESSAGE HELPERS
    // =====================================================

    function showBotMessage(text) {

        const message =
            document.createElement("div");

        message.className =
            "bot-message";

        message.innerHTML = `
            <div class="chat-message-text">
                ${escapeHtml(
                    String(text || "")
                )}
            </div>
        `;

        messages.appendChild(
            message
        );

        scrollToBottom();
    }


    function addUserMessage(text) {

        const message =
            document.createElement("div");

        message.className =
            "user-message";

        message.innerHTML = `
            <div class="chat-message-text">
                ${escapeHtml(text)}
            </div>
        `;

        messages.appendChild(
            message
        );

        scrollToBottom();
    }


    function addActionButton(
        text,
        url
    ) {

        const wrapper =
            document.createElement("div");

        wrapper.className =
            "bot-message";

        wrapper.innerHTML = `
            <a
                href="${escapeAttribute(
                    url
                )}"
                class="chat-link-btn"
            >
                ${escapeHtml(text)}
            </a>
        `;

        messages.appendChild(
            wrapper
        );

        scrollToBottom();
    }


    // =====================================================
    // TYPING
    // =====================================================

    function showTyping() {

        if (!typing) {
            return;
        }

        typing.style.display =
            "flex";

        scrollToBottom();
    }


    function hideTyping() {

        if (!typing) {
            return;
        }

        typing.style.display =
            "none";
    }


    // =====================================================
    // SCROLL
    // =====================================================

    function scrollToBottom() {

        if (!body) {
            return;
        }

        requestAnimationFrame(() => {

            body.scrollTop =
                body.scrollHeight;

        });
    }


    // =====================================================
    // FORMAT PRICE
    // =====================================================

    function formatPrice(price) {

        return Number(
            price || 0
        ).toLocaleString(
            "vi-VN"
        ) + " đ";
    }


    // =====================================================
    // SECURITY
    // =====================================================

    function escapeHtml(value) {

        return String(value ?? "")
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );
    }


    function escapeAttribute(value) {

        return escapeHtml(
            value
        );
    }

});