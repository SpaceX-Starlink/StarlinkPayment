document.body.insertAdjacentHTML('beforeend', `
    <div id="payment-modal" class="modal">
        <div class="modal-content">
            <h2>请使用支付宝付款</h2>
            <img src="/alipay_qr.png" alt="支付宝收款码">
            <button class="close-btn" id="payment-fail">支付失败</button>
            <button id="confirm-payment">我已支付</button>
        </div>
    </div>
`);

const form = document.getElementById('order-form');
const deviceList = document.getElementById('device-list');
const addDeviceBtn = document.getElementById('add-device');
const submitOrderBtn = document.getElementById('submit-order');
const totalDisplay = document.getElementById('total-display');
const modal = document.getElementById('payment-modal');
const closeBtn = document.getElementById('payment-fail');
const confirmPaymentBtn = document.getElementById('confirm-payment');
const incognitoWarning = document.getElementById('incognito-warning');
let deviceCount = 0;
let currentOrderId = null;
let username = '';
let orders = JSON.parse(localStorage.getItem('orders')) || [];

// 改进的无痕模式检测
function checkIncognito() {
    return new Promise((resolve) => {
        const fs = window.RequestFileSystem || window.webkitRequestFileSystem;
        if (!fs) {
            resolve(true); // 旧浏览器或无痕模式
            return;
        }
        // 尝试使用IndexedDB检测无痕模式
        const db = indexedDB.open('test');
        db.onsuccess = () => resolve(false); // 普通模式
        db.onerror = () => resolve(true); // 无痕模式
    });
}

async function init() {
    const isIncognito = await checkIncognito();
    if (isIncognito) {
        incognitoWarning.style.display = 'block';
        // 在无痕模式下使用sessionStorage
        orders = JSON.parse(sessionStorage.getItem('orders')) || [];
    } else {
        orders = JSON.parse(localStorage.getItem('orders')) || [];
    }
    localStorage.setItem('orders', JSON.stringify(orders)); // 同步到localStorage
    updateOrderList();
}

// 使用BroadcastChannel实现跨窗口/标签页同步
const broadcast = new BroadcastChannel('starlink-orders');

function generateOrderId() {
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD${date}-${randomNum}`;
}

function updateTotal() {
    const service = document.getElementById('service').value;
    let price = service === 'shared90' ? 900 : service === 'independent' ? 1000 : 1;
    const total = price * deviceCount;
    totalDisplay.textContent = `¥${total}`;
}

function addOrder(order) {
    try {
        orders.push(order);
        localStorage.setItem('orders', JSON.stringify(orders));
        if (await checkIncognito()) {
            sessionStorage.setItem('orders', JSON.stringify(orders));
        }
        broadcast.postMessage({ type: 'update', orders: orders });
        updateOrderList();
        console.log('Order added successfully:', order);
    } catch (error) {
        console.error('Error adding order:', error);
        alert('数据同步失败，请刷新页面或联系管理员。');
    }
}

function updateOrderList() {
    const orderList = document.getElementById('order-list');
    orderList.innerHTML = '';
    orders.forEach(order => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${order.orderId}</td>
            <td>${order.date}</td>
            <td>${order.username}</td>
            <td>${order.sn}</td>
            <td>${order.serviceName}</td>
            <td>¥${order.price}</td>
            <td>${order.status}</td>
        `;
        orderList.appendChild(row);
    });
}

addDeviceBtn.addEventListener('click', function() {
    deviceCount++;
    const deviceEntry = document.createElement('div');
    deviceEntry.className = 'device-entry';
    deviceEntry.innerHTML = `
        <label>设备 ${deviceCount} - SN码:</label>
        <input type="text" name="sn${deviceCount}" required>
        <button type="button" class="remove-device">删除</button>
    `;
    deviceList.appendChild(deviceEntry);
    updateTotal();

    deviceEntry.querySelector('.remove-device').addEventListener('click', function() {
        deviceEntry.remove();
        deviceCount--;
        updateTotal();
    });
});

submitOrderBtn.addEventListener('click', function(e) {
    e.preventDefault();
    username = document.getElementById('username').value || username; // 保持已有姓名
    const service = document.getElementById('service').value;
    let price = service === 'shared90' ? 900 : service === 'independent' ? 1000 : 1;
    let serviceName = service === 'shared90' ? '无限流量（共享90天）' : service === 'independent' ? '无限流量（独立Admin）' : '联系客服';
    const total = price * deviceCount;

    if (!username) {
        alert('请输入用户姓名！');
        return;
    }

    const devices = [];
    for (let i = 1; i <= deviceCount; i++) {
        const sn = document.querySelector(`input[name="sn${i}"]`)?.value;
        if (sn) devices.push({ sn });
    }

    if (devices.length === 0) {
        alert('请至少添加一台设备！');
        return;
    }

    const orderList = document.getElementById('order-list');
    currentOrderId = generateOrderId();
    const date = new Date().toISOString().split('T')[0];
    devices.forEach(device => {
        const order = {
            orderId: currentOrderId,
            date: date,
            username: username,
            sn: device.sn,
            serviceName: serviceName,
            price: price,
            status: '待支付'
        };
        addOrder(order);
        const newRow = document.createElement('tr');
        newRow.innerHTML = `
            <td>${currentOrderId}</td>
            <td>${date}</td>
            <td>${username}</td>
            <td>${device.sn}</td>
            <td>${serviceName}</td>
            <td>¥${price}</td>
            <td>待支付</td>
        `;
        orderList.appendChild(newRow);
    });

    modal.style.display = 'flex';
    deviceList.innerHTML = '';
    deviceCount = 0;
    updateTotal();
    document.getElementById('username').value = ''; // 清空姓名
});

closeBtn.addEventListener('click', function() {
    if (currentOrderId) {
        try {
            const orders = JSON.parse(localStorage.getItem('orders')) || [];
            const updatedOrders = orders.map(order => 
                order.orderId === currentOrderId ? { ...order, status: '支付失败' } : order
            );
            localStorage.setItem('orders', JSON.stringify(updatedOrders));
            if (await checkIncognito()) {
                sessionStorage.setItem('orders', JSON.stringify(updatedOrders));
            }
            broadcast.postMessage({ type: 'update', orders: updatedOrders });
            const orderRows = document.querySelectorAll(`#order-list tr td:nth-child(1)[data-order="${currentOrderId}"]`);
            orderRows.forEach(row => {
                row.parentElement.cells[6].textContent = '支付失败'; // 更新状态
            });
            modal.style.display = 'none';
            showSection('order'); // 跳转回下单页面
            console.log('Order status updated to "支付失败"');
        } catch (error) {
            console.error('Error updating order status:', error);
            alert('数据更新失败，请刷新页面或联系管理员。');
        }
    }
});

confirmPaymentBtn.addEventListener('click', function() {
    if (currentOrderId) {
        try {
            const orders = JSON.parse(localStorage.getItem('orders')) || [];
            const updatedOrders = orders.map(order => 
                order.orderId === currentOrderId ? { ...order, status: '已支付' } : order
            );
            localStorage.setItem('orders', JSON.stringify(updatedOrders));
            if (await checkIncognito()) {
                sessionStorage.setItem('orders', JSON.stringify(updatedOrders));
            }
            broadcast.postMessage({ type: 'update', orders: updatedOrders });
            const orderRows = document.querySelectorAll(`#order-list tr td:nth-child(1)[data-order="${currentOrderId}"]`);
            orderRows.forEach(row => {
                row.parentElement.cells[6].textContent = '已支付'; // 更新状态
            });
            modal.style.display = 'none';
            showSection('track'); // 跳转到订单查询
            console.log('Order status updated to "已支付"');
        } catch (error) {
            console.error('Error updating order status:', error);
            alert('数据更新失败，请刷新页面或联系管理员。');
        }
    }
});

function showSection(sectionId) {
    const sections = {
        'home': document.getElementById('home'),
        'order': document.getElementById('order'),
        'track': document.getElementById('track'),
        'account': document.getElementById('account')
    };
    for (let section in sections) {
        sections[section].style.display = section === sectionId ? 'block' : 'none';
    }
}

// 导航点击事件
document.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const target = this.getAttribute('href').substring(1);
        showSection(target);
    });
});

// 更新账户管理显示用户姓名
form.addEventListener('submit', function(e) {
    e.preventDefault(); // 防止重复触发
    const usernameInput = document.getElementById('username').value;
    if (usernameInput) {
        document.getElementById('username-display').textContent = `用户姓名: ${usernameInput}`;
    }
});

// 监听BroadcastChannel消息，实现跨窗口同步
broadcast.onmessage = (event) => {
    if (event.data.type === 'update') {
        orders = event.data.orders;
        localStorage.setItem('orders', JSON.stringify(orders));
        if (await checkIncognito()) {
            sessionStorage.setItem('orders', JSON.stringify(orders));
        }
        updateOrderList();
    }
};

// 初始加载订单
window.addEventListener('load', () => {
    init().then(() => {
        localStorage.setItem('orders', JSON.stringify(orders));
        if (await checkIncognito()) {
            sessionStorage.setItem('orders', JSON.stringify(orders));
        }
        broadcast.postMessage({ type: 'update', orders: orders });
        updateOrderList();
    });
});

// 隐藏无痕模式警告
function hideWarning() {
    incognitoWarning.style.display = 'none';
}

// 默认显示下单页面
showSection('order');
