import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  onSnapshot,
  query,
  orderBy,
  getDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL,
  deleteObject
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

const firebaseConfig = {
  apiKey: "AIzaSyCTWg_Hq-TQe3SRwHOj5hVwb9S8gX5glZk",
  authDomain: "jamiat-16eb0.firebaseapp.com",
  projectId: "jamiat-16eb0",
  storageBucket: "jamiat-16eb0.firebasestorage.app",
  messagingSenderId: "1014125063682",
  appId: "1:1014125063682:web:1ba1b165f92c4fea3c3cee"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

let messages = [];
let programs = [];
let members = [];
let attendance = [];
let deleteTarget = null;

function switchTab(tabName) {
  document.querySelectorAll('.tab-btn, .mobile-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `${tabName}-tab`);
  });
}

function openModal(modalId) {
  document.getElementById('modal-overlay').classList.add('active');
  document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
  document.getElementById('modal-overlay').classList.remove('active');
  document.getElementById(modalId).classList.remove('active');
  if (modalId !== 'delete-modal') {
    document.getElementById(`${modalId.replace('-modal', '-form')}`)?.reset();
  }
}

async function uploadImage(file, path) {
  const timestamp = Date.now();
  const filename = `${file.name}_${timestamp}`;
  const storageRef = ref(storage, `${path}/${filename}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function renderMessages() {
  const container = document.getElementById('messages-list');
  if (messages.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">💬</div>
        <h3>No messages yet</h3>
        <p>Be the first to share a message with the community</p>
        <button class="btn-primary" onclick="openModal('message-modal')">Post First Message</button>
      </div>
    `;
    return;
  }
  container.innerHTML = messages.map(msg => `
    <div class="card">
      <button class="delete-btn" onclick="confirmDelete('message', '${msg.id}', '${msg.title}')">🗑️</button>
      <div class="card-header">
        <h3 class="card-title">${msg.title}</h3>
      </div>
      <div class="card-content">${msg.content}</div>
      ${msg.images && msg.images.length > 0 ? `
        <div class="images-grid">
          ${msg.images.map(url => `<img src="${url}" alt="Message image">`).join('')}
        </div>
      ` : ''}
      <div class="card-meta">${formatDate(msg.createdAt)}</div>
    </div>
  `).join('');
}

function renderPrograms() {
  const container = document.getElementById('programs-list');
  if (programs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">📅</div>
        <h3>No programs yet</h3>
        <p>Start documenting your weekly programs and events</p>
        <button class="btn-primary" onclick="openModal('program-modal')">Add First Program</button>
      </div>
    `;
    return;
  }
  container.innerHTML = programs.map(prog => `
    <div class="card">
      <button class="delete-btn" onclick="confirmDelete('program', '${prog.id}', '${prog.title}')">🗑️</button>
      ${prog.featuredImage ? `<img src="${prog.featuredImage}" style="width:100%;height:200px;object-fit:cover;border-radius:6px;margin-bottom:12px;" alt="${prog.title}">` : ''}
      <div class="card-header">
        <h3 class="card-title">${prog.title}</h3>
      </div>
      ${prog.isUpcoming ? '<span class="badge badge-primary">Upcoming</span>' : '<span class="badge badge-secondary">Completed</span>'}
      <div class="card-content">${prog.description}</div>
      <div class="card-meta">
        📍 ${prog.location} | 📅 ${formatDate(prog.date)}
      </div>
      ${prog.galleryImages && prog.galleryImages.length > 0 ? `
        <div class="images-grid">
          ${prog.galleryImages.map(url => `<img src="${url}" alt="Program gallery">`).join('')}
        </div>
      ` : ''}
    </div>
  `).join('');
}

function renderMembers() {
  const container = document.getElementById('members-list');
  if (members.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">👥</div>
        <h3>No members yet</h3>
        <p>Add members to start tracking attendance</p>
        <button class="btn-primary" onclick="openModal('member-modal')">Add First Member</button>
      </div>
    `;
    return;
  }
  container.innerHTML = `<div class="members-grid">${members.map(member => {
    const memberAttendance = attendance.filter(a => a.memberId === member.id).length;
    const totalPrograms = programs.filter(p => !p.isUpcoming).length;
    const attendanceRate = totalPrograms > 0 ? Math.round((memberAttendance / totalPrograms) * 100) : 0;
    
    return `
      <div class="card member-card">
        <button class="delete-btn" onclick="confirmDelete('member', '${member.id}', '${member.name}')">🗑️</button>
        <div class="member-avatar">${getInitials(member.name)}</div>
        <h3 class="card-title">${member.name}</h3>
        <div class="card-meta">📞 ${member.phone}</div>
        ${member.email ? `<div class="card-meta">✉️ ${member.email}</div>` : ''}
        <div style="margin-top:12px;">
          <span class="badge ${attendanceRate >= 70 ? 'badge-success' : attendanceRate >= 40 ? 'badge-warning' : 'badge-danger'}">
            ${attendanceRate}% Attendance
          </span>
          <div class="card-meta">${memberAttendance} / ${totalPrograms} programs</div>
        </div>
      </div>
    `;
  }).join('')}</div>`;
}

function updateAttendanceModal() {
  const programSelect = document.getElementById('program-select');
  const checklist = document.getElementById('members-checklist');
  
  programSelect.innerHTML = '<option value="">Choose a program...</option>' + 
    programs.map(p => `<option value="${p.id}">${p.title} - ${formatDate(p.date)}</option>`).join('');
  
  checklist.innerHTML = members.map(m => `
    <div class="checkbox-item">
      <input type="checkbox" name="members" value="${m.id}" id="member-${m.id}">
      <label for="member-${m.id}">${m.name}</label>
    </div>
  `).join('');
}

function confirmDelete(type, id, name) {
  deleteTarget = { type, id };
  document.getElementById('delete-message').textContent = 
    `Are you sure you want to delete "${name}"? This action cannot be undone.`;
  openModal('delete-modal');
}

async function performDelete() {
  if (!deleteTarget) return;
  
  const { type, id } = deleteTarget;
  
  try {
    if (type === 'message') {
      const messageDoc = await getDoc(doc(db, 'messages', id));
      const messageData = messageDoc.data();
      
      if (messageData?.images) {
        for (const imageUrl of messageData.images) {
          try {
            const imageRef = ref(storage, imageUrl);
            await deleteObject(imageRef);
          } catch (error) {
            console.error('Failed to delete image:', error);
          }
        }
      }
      
      await deleteDoc(doc(db, 'messages', id));
    } else if (type === 'program') {
      const programDoc = await getDoc(doc(db, 'programs', id));
      const programData = programDoc.data();
      
      if (programData?.featuredImage) {
        try {
          await deleteObject(ref(storage, programData.featuredImage));
        } catch (error) {
          console.error('Failed to delete featured image:', error);
        }
      }
      
      if (programData?.galleryImages) {
        for (const imageUrl of programData.galleryImages) {
          try {
            await deleteObject(ref(storage, imageUrl));
          } catch (error) {
            console.error('Failed to delete gallery image:', error);
          }
        }
      }
      
      await deleteDoc(doc(db, 'programs', id));
    } else if (type === 'member') {
      await deleteDoc(doc(db, 'members', id));
    } else if (type === 'attendance') {
      await deleteDoc(doc(db, 'attendance', id));
    }
    
    closeModal('delete-modal');
    deleteTarget = null;
  } catch (error) {
    console.error('Delete failed:', error);
    alert('Failed to delete item. Please try again.');
  }
}

onSnapshot(query(collection(db, 'messages'), orderBy('createdAt', 'desc')), snapshot => {
  messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  renderMessages();
});

onSnapshot(query(collection(db, 'programs'), orderBy('date', 'desc')), snapshot => {
  programs = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      isUpcoming: new Date(data.date) > new Date()
    };
  });
  renderPrograms();
  updateAttendanceModal();
});

onSnapshot(query(collection(db, 'members'), orderBy('name')), snapshot => {
  members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  renderMembers();
  updateAttendanceModal();
});

onSnapshot(query(collection(db, 'attendance'), orderBy('createdAt', 'desc')), snapshot => {
  attendance = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  renderMembers();
});

document.querySelectorAll('.tab-btn, .mobile-tab').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

document.querySelectorAll('.close-btn, .cancel-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    closeModal(btn.closest('.modal').id);
  });
});

document.getElementById('modal-overlay').addEventListener('click', () => {
  document.querySelectorAll('.modal.active').forEach(modal => {
    closeModal(modal.id);
  });
});

document.getElementById('add-message-btn').addEventListener('click', () => openModal('message-modal'));
document.getElementById('add-program-btn').addEventListener('click', () => openModal('program-modal'));
document.getElementById('add-member-btn').addEventListener('click', () => openModal('member-modal'));
document.getElementById('mark-attendance-btn').addEventListener('click', () => openModal('attendance-modal'));
document.getElementById('confirm-delete-btn').addEventListener('click', performDelete);

document.getElementById('message-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const images = [];
  
  const files = formData.getAll('images');
  for (const file of files) {
    if (file && file.size > 0) {
      const url = await uploadImage(file, 'messages');
      images.push(url);
    }
  }
  
  await addDoc(collection(db, 'messages'), {
    title: formData.get('title'),
    content: formData.get('content'),
    images,
    createdAt: new Date().toISOString()
  });
  
  closeModal('message-modal');
});

document.getElementById('program-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  
  let featuredImage = null;
  const featuredFile = formData.get('featuredImage');
  if (featuredFile && featuredFile.size > 0) {
    featuredImage = await uploadImage(featuredFile, 'programs/featured');
  }
  
  const galleryImages = [];
  const galleryFiles = formData.getAll('galleryImages');
  for (const file of galleryFiles) {
    if (file && file.size > 0) {
      const url = await uploadImage(file, 'programs/gallery');
      galleryImages.push(url);
    }
  }
  
  await addDoc(collection(db, 'programs'), {
    title: formData.get('title'),
    description: formData.get('description'),
    date: new Date(formData.get('date')).toISOString(),
    location: formData.get('location'),
    featuredImage,
    galleryImages,
    createdAt: new Date().toISOString()
  });
  
  closeModal('program-modal');
});

document.getElementById('member-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  
  await addDoc(collection(db, 'members'), {
    name: formData.get('name'),
    phone: formData.get('phone'),
    email: formData.get('email') || null
  });
  
  closeModal('member-modal');
});

document.getElementById('attendance-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const programId = formData.get('program');
  const selectedMembers = Array.from(document.querySelectorAll('input[name="members"]:checked')).map(cb => cb.value);
  
  if (!programId || selectedMembers.length === 0) {
    alert('Please select a program and at least one member');
    return;
  }
  
  const program = programs.find(p => p.id === programId);
  
  for (const memberId of selectedMembers) {
    const member = members.find(m => m.id === memberId);
    await addDoc(collection(db, 'attendance'), {
      programId,
      memberId,
      programTitle: program.title,
      memberName: member.name,
      date: program.date,
      createdAt: new Date().toISOString()
    });
  }
  
  closeModal('attendance-modal');
});

window.openModal = openModal;
window.closeModal = closeModal;
window.confirmDelete = confirmDelete;