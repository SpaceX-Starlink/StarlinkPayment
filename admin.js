// 初始定义管理员密码（仅前端示例，建议后端存储）
const ADMIN_PASSWORD = 'starlink123'; // 替换为你的实际密码

// 登录检查
document.getElementById('admin-login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const password = document.getElementById('admin-password').value;
    if (password === ADMIN_PASSWORD) {
        document.getElementById('admin-login').style.display = 'none';
        showSection('orders');
    } else {
        alert('密码错误，请重试！');
    }
});

// 加载所有订单
let orders = JSON.parse(localStorage.getItem('orders')) || JSON.parse(sessionStorage.getItem('orders')) || [];

// 使用BroadcastChannel实现跨窗口/标签页同步
const broadcast = new BroadcastChannel('starlink-orders');

function addOrder(order) {
    try {
        orders.push(order);
        localStorage.setItem('orders', JSON.stringify(orders));
        const isIncognito = checkIncognito();
        if (isIncognito) {
            sessionStorage.setItem('orders', JSON.stringify(orders));
        }
        broadcast.postMessage({ type: 'update', orders: orders });
        updateOrderList();
        console.log('Order added successfully in admin:', order);
    } catch (error) {
        console.error('Error adding order in admin:', error);
        alert('数据同步失败，请刷新页面或联系管理员。');
    }
}

function updateOrderList() {
    const orderList = document.getElementById('admin-order-list');
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
            <td><button onclick="editStatus('${order.orderId}')">编辑状态</button></td>
        `;
        orderList.appendChild(row);
    });
}

function editStatus(orderId) {
    const newStatus = prompt('输入新状态（待支付、已支付、支付失败、已发货、已完成）：', '');
    if (newStatus) {
        try {
            const updatedOrders = orders.map(order => 
                order.orderId === orderId ? { ...order, status: newStatus } : order
            );
            orders = updatedOrders;
            localStorage.setItem('orders', JSON.stringify(orders));
            const isIncognito = checkIncognito();
            if (isIncognito) {
                sessionStorage.setItem('orders', JSON.stringify(orders));
            }
            broadcast.postMessage({ type: 'update', orders: updatedOrders });
            updateOrderList();
            console.log('Order status updated successfully:', { orderId, newStatus });
        } catch (error) {
            console.error('Error editing order status:', error);
            alert('数据更新失败，请刷新页面或联系管理员。');
        }
    }
}

function filterOrders() {
    const searchTerm = document.getElementById('search-orders').value.toLowerCase();
    const filteredOrders = orders.filter(order => 
        order.orderId.toLowerCase().includes(searchTerm) || 
        order.username.toLowerCase().includes(searchTerm)
    );
    const orderList = document.getElementById('admin-order-list');
    orderList.innerHTML = '';
    filteredOrders.forEach(order => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${order.orderId}</td>
            <td>${order.date}</td>
            <td>${order.username}</td>
            <td>${order.sn}</td>
            <td>${order.serviceName}</td>
            <td>¥${order.price}</td>
            <td>${order.status}</td>
            <td><button onclick="editStatus('${order.orderId}')">编辑状态</button></td>
        `;
        orderList.appendChild(row);
    });
}

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

// 监听BroadcastChannel消息，实现跨窗口同步
broadcast.onmessage = (event) => {
    if (event.data.type === 'update') {
        orders = event.data.orders;
        localStorage.setItem('orders', JSON.stringify(orders));
        checkIncognito().then(isIncognito => {
            if (isIncognito) {
                sessionStorage.setItem('orders', JSON.stringify(orders));
            }
        });
        updateOrderList();
    }
};

// 监听localStorage变化，确保实时同步
window.addEventListener('storage', (e) => {
    if (e.key === 'orders') {
        orders = JSON.parse(localStorage.getItem('orders')) || JSON.parse(sessionStorage.getItem('orders')) || [];
        updateOrderList();
    }
});

// 初始加载订单
window.addEventListener('load', () => {
    checkIncognito().then(isIncognito => {
        if (isIncognito) {
            orders = JSON.parse(sessionStorage.getItem('orders')) || [];
        } else {
            orders = JSON.parse(localStorage.getItem('orders')) || [];
        }
        localStorage.setItem('orders', JSON.stringify(orders));
        sessionStorage.setItem('orders', JSON.stringify(orders));
        broadcast.postMessage({ type: 'update', orders: orders });
        updateOrderList();
        if (isIncognito) {
            document.getElementById('admin-login').style.display = 'block'; // 默认显示登录弹窗
            showSection('orders');
        } else {
            document.getElementById('admin-login').style.display = 'block'; // 默认显示登录弹窗
            showSection('orders');
        }
    });
});

// 默认显示登录弹窗
function showSection(sectionId) {
    const sections = {
        'dashboard': document.getElementById('dashboard'),
        'orders': document.getElementById('orders')
    };
    for (let section in sections) {
        sections[section].style.display = section === sectionId ? 'block' : 'none';
    }
}

document.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const target = this.getAttribute('href').substring(1);
        showSection(target);
    });
});

// 初始显示登录弹窗
showSection('orders');
