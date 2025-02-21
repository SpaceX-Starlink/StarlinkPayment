// 加载所有订单
let orders = JSON.parse(localStorage.getItem('orders')) || JSON.parse(sessionStorage.getItem('orders')) || [];

// 使用BroadcastChannel实现跨窗口/标签页同步
const broadcast = new BroadcastChannel('starlink-orders');

function addOrder(order) {
    orders.push(order);
    localStorage.setItem('orders', JSON.stringify(orders));
    sessionStorage.setItem('orders', JSON.stringify(orders));
    broadcast.postMessage({ type: 'update', orders: orders });
    updateOrderList();
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
        const updatedOrders = orders.map(order => 
            order.orderId === orderId ? { ...order, status: newStatus } : order
        );
        orders = updatedOrders;
        localStorage.setItem('orders', JSON.stringify(orders));
        sessionStorage.setItem('orders', JSON.stringify(orders));
        broadcast.postMessage({ type: 'update', orders: updatedOrders });
        updateOrderList();
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

// 监听BroadcastChannel消息，实现跨窗口同步
broadcast.onmessage = (event) => {
    if (event.data.type === 'update') {
        orders = event.data.orders;
        localStorage.setItem('orders', JSON.stringify(orders));
        sessionStorage.setItem('orders', JSON.stringify(orders));
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
    orders = JSON.parse(localStorage.getItem('orders')) || JSON.parse(sessionStorage.getItem('orders')) || [];
    localStorage.setItem('orders', JSON.stringify(orders));
    sessionStorage.setItem('orders', JSON.stringify(orders));
    broadcast.postMessage({ type: 'update', orders: orders });
    updateOrderList();
});

// 默认显示订单页面
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

showSection('orders');
updateOrderList();