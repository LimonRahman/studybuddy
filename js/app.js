/* StudyBuddy - Frontend App Script (with login + feature toggles and full pages) */
(function () {
	'use strict';
	const $ = (sel, scope = document) => scope.querySelector(sel);
	const $$ = (sel, scope = document) => Array.from(scope.querySelectorAll(sel));
	const storage = { get(k,f){ try { return JSON.parse(localStorage.getItem(k)) ?? f; } catch { return f; } }, set(k,v){ localStorage.setItem(k, JSON.stringify(v)); } };

	// Theme
	const THEME_KEY = 'sb-theme';
	function applyTheme(theme){ const root = document.documentElement; if (theme==='dark') root.classList.add('dark'); else root.classList.remove('dark'); }
	function initTheme(){ const saved = storage.get(THEME_KEY, null); const prefers = window.matchMedia('(prefers-color-scheme: dark)').matches; applyTheme(saved ?? (prefers?'dark':'light')); }
	function toggleTheme(){ const isDark = document.documentElement.classList.contains('dark'); const next = isDark?'light':'dark'; applyTheme(next); storage.set(THEME_KEY, next); $$('input[data-role="theme-toggle"]').forEach(el=> el.checked = next==='dark'); }

	// Auth
	const AUTH_KEY = 'sb-auth';
	function isAuthed(){ return !!storage.get(AUTH_KEY, null); }
	function requireAuth(){ const page = document.body.getAttribute('data-page'); if (page !== 'login' && !isAuthed()) { window.location.href = 'index.html'; } }
	function doLogout(){ storage.set(AUTH_KEY, null); window.location.href = 'index.html'; }

	// Feature toggles
	const DEFAULT_FEATURES = { schedule:true, goals:true, focus:true, review:true, resources:true, flashcards:true, feedback:true };
	function getFeatures(){ return { ...DEFAULT_FEATURES, ...storage.get('sb-features', {}) }; }
	function setFeatures(f){ storage.set('sb-features', f); }
	function enforceFeatureGate(){ const page = document.body.getAttribute('data-page'); const features = getFeatures(); const gated = ['schedule','goals','focus','review','resources','flashcards','feedback']; if (gated.includes(page) && features[page] === false){ window.location.href = 'settings.html'; } }

	// Navbar
	const NAV_LINKS = [
		{ href: 'dashboard.html', key: 'dashboard', label: 'Dashboard' },
		{ href: 'schedule.html', key: 'schedule', label: 'Schedule' },
		{ href: 'goals.html', key: 'goals', label: 'Goals' },
		{ href: 'focus.html', key: 'focus', label: 'Focus' },
		{ href: 'review.html', key: 'review', label: 'Review' },
		{ href: 'resources.html', key: 'resources', label: 'Resources' },
		{ href: 'flashcards.html', key: 'flashcards', label: 'Flashcards' },
		{ href: 'feedback.html', key: 'feedback', label: 'Feedback' },
		{ href: 'settings.html', key: 'settings', label: 'Settings' }
	];
	function renderNavbar(){
		const container = $('#navbar'); if (!container) return;
		const page = document.body.getAttribute('data-page');
		
		// Don't render navbar on login page
		if (page === 'login') return;
		
		const features = getFeatures();
		const links = NAV_LINKS.map((l)=>{ const gate = ['dashboard','settings'].includes(l.key) || features[l.key] !== false; if (!gate) return ''; return `<a href="${l.href}" class="px-3 py-2 rounded-xl text-sm font-medium transition-colors ${page===l.key?'bg-primary-500 text-white':'hover:bg-gray-100 dark:hover:bg-gray-700'}">${l.label}</a>`; }).join('');
		container.innerHTML = `
			<nav class="backdrop-blur bg-white/70 dark:bg-gray-900/60 border-b border-gray-200/70 dark:border-gray-800 sticky top-0 z-30">
				<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div class="flex items-center justify-between h-16">
								<a href="dashboard.html" class="flex items-center space-x-2 group">
			<div class="w-8 h-8 rounded-xl bg-primary-500 text-white grid place-items-center font-bold">SB</div>
			<span class="font-semibold">StudyBuddy</span>
		</a>
						<div class="hidden md:flex items-center space-x-1">${links}</div>
						<div class="flex items-center space-x-3">
							<label class="switch" title="Toggle dark mode">
								<input type="checkbox" data-role="theme-toggle" />
								<span class="slider"></span>
							</label>
							<button id="mobileMenuBtn" class="md:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700">
								<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
							</button>
						</div>
					</div>
					<div id="mobileMenu" class="md:hidden py-2 hidden">${links}</div>
				</div>
			</nav>`;
		const sw = $('input[data-role="theme-toggle"]'); if (sw){ sw.checked = document.documentElement.classList.contains('dark'); sw.addEventListener('change', toggleTheme); }
		const btn = $('#mobileMenuBtn'), menu = $('#mobileMenu'); btn&&menu&&btn.addEventListener('click', ()=> menu.classList.toggle('hidden'));
	}

	// Login
	function initLogin(){ if (document.body.getAttribute('data-page') !== 'login') return; const form = $('#loginForm'); form?.addEventListener('submit', (e)=>{ e.preventDefault(); const email = form.email.value.trim(); const pass = form.password.value; if (!/.+@.+\..+/.test(email) || pass.length < 4) { alert('Enter a valid email and password (min 4 chars).'); return; } storage.set(AUTH_KEY, { email }); window.location.href = 'dashboard.html'; }); }

	// Dashboard
	function initDashboard() {
		if (document.body.getAttribute('data-page') !== 'dashboard') return;
		const sessions = storage.get('sb-sessions', []);
		const goals = storage.get('sb-goals', []);
		const pomodoros = storage.get('sb-pomodoro-cycles', 0);
		const flashcards = storage.get('sb-flashcards', []);
		const todayIdx = new Date().getDay();
		const dayMap = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
		const today = dayMap[todayIdx];
		const todayList = $('#todaySchedule');
		if (todayList) {
			const todaySessions = sessions.filter(s => s.day === today);
			if (todaySessions.length === 0) todayList.innerHTML = '<li class="text-gray-500">No sessions planned for today.</li>';
			else {
				todaySessions.sort((a,b)=>a.start.localeCompare(b.start));
				todayList.innerHTML = todaySessions.map(s => `
					<li class="p-3 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-between hover-lift">
						<div class="flex items-center space-x-3">
							<span class="w-2.5 h-8 rounded-full" style="background:${s.color || '#6366F1'}"></span>
							<div>
								<p class="font-medium">${s.title}</p>
								<p class="text-sm text-gray-500">${s.start} - ${s.end}</p>
							</div>
						</div>
						<a class="text-primary-600 text-sm" href="schedule.html">Edit</a>
					</li>`).join('');
			}
		}
		const totalTargets = goals.reduce((a,g)=>a + (Number(g.target)||0), 0) || 0;
		const totalProgress = goals.reduce((a,g)=>a + (Number(g.progress)||0), 0) || 0;
		const pct = totalTargets ? Math.min(100, Math.round((totalProgress/totalTargets)*100)) : 0;
		const bar = $('#weeklyProgressBar'); const txt = $('#weeklyProgressText'); if (bar) bar.style.width = pct + '%'; if (txt) txt.textContent = `${pct}% complete`;
		const pinned = storage.get('sb-pinned', []); const list = $('#pinnedTasks');
		function renderPinned(){ if (!list) return; list.innerHTML = pinned.map((t, i) => `
			<li class="p-3 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-between">
				<span class="truncate">${t}</span>
				<button data-index="${i}" class="text-red-500 hover:text-red-600 remove-pinned">Remove</button>
			</li>`).join(''); $$('.remove-pinned', list).forEach(btn => btn.addEventListener('click', (e) => { const idx = Number(e.currentTarget.getAttribute('data-index')); pinned.splice(idx,1); storage.set('sb-pinned', pinned); renderPinned(); })); }
		renderPinned(); const addBtn = $('#addPinnedTask'); const input = $('#newPinnedTask'); if (addBtn && input) addBtn.addEventListener('click', () => { const val = (input.value || '').trim(); if (!val) return; pinned.push(val); storage.set('sb-pinned', pinned); input.value=''; renderPinned(); });
		const sessionsThisWeek = sessions.length; $('#statSessions') && ($('#statSessions').textContent = String(sessionsThisWeek)); $('#statGoals') && ($('#statGoals').textContent = String(goals.length)); $('#statPomodoro') && ($('#statPomodoro').textContent = String(pomodoros)); $('#statFlashcards') && ($('#statFlashcards').textContent = String(flashcards.length));
	}

	// Schedule
	function initSchedule(){ if (document.body.getAttribute('data-page') !== 'schedule') return; enforceFeatureGate(); const dayMap = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']; const today = dayMap[new Date().getDay()]; const sessions = storage.get('sb-sessions', []); const form = $('#sessionForm'); const listWrap = $('#weekColumns'); let editingId = null; function uid(){ return 's_' + Math.random().toString(36).slice(2,9); } function renderWeek(){ if (!listWrap) return; listWrap.innerHTML = dayMap.map(d => `
		<div class="bg-white/70 dark:bg-gray-800/60 border border-gray-200/70 dark:border-gray-700 rounded-2xl p-4 ${d===today ? 'ring-2 ring-primary-400' : ''}">
			<h3 class="font-semibold mb-3">${d}</h3>
			<ul class="space-y-2">${sessions.filter(s=>s.day===d).sort((a,b)=>a.start.localeCompare(b.start)).map(s => `
				<li class="flex items-center justify-between p-2 rounded-xl border border-gray-200 dark:border-gray-700">
					<div class="flex items-center space-x-3">
						<span class="w-2.5 h-8 rounded-full" style="background:${s.color || '#6366F1'}"></span>
						<div>
							<p class="font-medium">${s.title}</p>
							<p class="text-sm text-gray-500">${s.start} - ${s.end}</p>
						</div>
					</div>
					<div class="space-x-2">
						<button data-id="${s.id}" class="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm edit-session">Edit</button>
						<button data-id="${s.id}" class="px-2 py-1 rounded-lg bg-red-100 text-red-600 text-sm delete-session">Delete</button>
					</div>
				</li>`).join('')}</ul>
		</div>`).join(''); $$('.edit-session', listWrap).forEach(btn => btn.addEventListener('click', (e) => { const id = e.currentTarget.getAttribute('data-id'); const s = sessions.find(x=>x.id===id); if (!s) return; form.title.value = s.title; form.day.value = s.day; form.start.value = s.start; form.end.value = s.end; form.color.value = s.color || '#6366F1'; editingId = id; form.querySelector('button[type="submit"]').textContent = 'Update Session'; })); $$('.delete-session', listWrap).forEach(btn => btn.addEventListener('click', (e) => { const id = e.currentTarget.getAttribute('data-id'); const idx = sessions.findIndex(x=>x.id===id); if (idx>=0) { sessions.splice(idx,1); storage.set('sb-sessions', sessions); renderWeek(); } })); } form?.addEventListener('submit', (e) => { e.preventDefault(); const entry = { id: editingId ?? uid(), title: form.title.value.trim() || 'Study Session', day: form.day.value, start: form.start.value, end: form.end.value, color: form.color.value }; if (editingId) { const i = sessions.findIndex(s=>s.id===editingId); if (i>=0) sessions[i] = entry; } else { sessions.push(entry); } storage.set('sb-sessions', sessions); form.reset(); form.color.value = '#6366F1'; editingId = null; form.querySelector('button[type="submit"]').textContent = 'Add Session'; renderWeek(); }); renderWeek(); }

	// Goals
	function initGoals(){ if (document.body.getAttribute('data-page') !== 'goals') return; enforceFeatureGate(); const goals = storage.get('sb-goals', []); const form = $('#goalForm'); const list = $('#goalsList'); let editingId = null; function uid(){ return 'g_' + Math.random().toString(36).slice(2,9); } function render(){ if (!list) return; list.innerHTML = goals.map(g => { const pct = g.target ? Math.min(100, Math.round((Number(g.progress)||0)/Number(g.target)*100)) : 0; return `
		<li class="p-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/60">
			<div class="flex items-center justify-between">
				<h4 class="font-semibold">${g.title}</h4>
				<div class="space-x-2">
					<button class="px-2 py-1 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 edit-goal" data-id="${g.id}">Edit</button>
					<button class="px-2 py-1 text-sm rounded-lg bg-red-100 text-red-600 delete-goal" data-id="${g.id}">Delete</button>
				</div>
			</div>
			<div class="mt-3">
				<div class="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
					<div class="h-full bg-primary-500 rounded-full transition-all" style="width:${pct}%"></div>
				</div>
				<p class="text-sm mt-1 text-gray-500">${g.progress}/${g.target} (${pct}%)</p>
			</div>
		</li>`; }).join(''); $$('.edit-goal', list).forEach(btn => btn.addEventListener('click', (e) => { const id = e.currentTarget.getAttribute('data-id'); const g = goals.find(x=>x.id===id); if (!g) return; form.title.value = g.title; form.target.value = g.target; form.progress.value = g.progress; editingId = id; form.querySelector('button[type="submit"]').textContent = 'Update Goal'; })); $$('.delete-goal', list).forEach(btn => btn.addEventListener('click', (e) => { const id = e.currentTarget.getAttribute('data-id'); const i = goals.findIndex(x=>x.id===id); if (i>=0) { goals.splice(i,1); storage.set('sb-goals', goals); render(); } })); } form?.addEventListener('submit', (e) => { e.preventDefault(); const entry = { id: editingId ?? uid(), title: form.title.value.trim() || 'New Goal', target: Number(form.target.value)||0, progress: Number(form.progress.value)||0 }; if (editingId) { const i = goals.findIndex(x=>x.id===editingId); if (i>=0) goals[i] = entry; } else goals.push(entry); storage.set('sb-goals', goals); form.reset(); editingId = null; form.querySelector('button[type="submit"]').textContent = 'Add Goal'; render(); }); render(); }

	// Focus
	function initFocus(){ if (document.body.getAttribute('data-page') !== 'focus') return; enforceFeatureGate(); const display = $('#timerDisplay'); const startBtn = $('#startTimer'); const pauseBtn = $('#pauseTimer'); const resetBtn = $('#resetTimer'); const modeLabel = $('#timerMode'); const checklistForm = $('#focusChecklistForm'); const checklistList = $('#focusChecklist'); const pledge = $('#studyPledge'); const breathing = $('#breathingCircle'); let workDuration = storage.get('sb-focus-work', 25) * 60; let breakDuration = storage.get('sb-focus-break', 5) * 60; let remaining = workDuration; let mode = 'Work'; let timerId = null; function format(sec){ const m = Math.floor(sec/60).toString().padStart(2,'0'); const s = (sec%60).toString().padStart(2,'0'); return `${m}:${s}`; } function update(){ if (display) display.textContent = format(remaining); if (modeLabel) modeLabel.textContent = mode; } function start(){ if (timerId) return; timerId = setInterval(()=>{ remaining--; if (remaining<=0){ switchMode(); } update(); }, 1000); } function pause(){ if (timerId){ clearInterval(timerId); timerId = null; } } function reset(){ pause(); mode='Work'; remaining = workDuration; update(); } function switchMode(){ pause(); if (mode==='Work'){ mode='Break'; remaining = breakDuration; const cycles = storage.get('sb-pomodoro-cycles', 0)+1; storage.set('sb-pomodoro-cycles', cycles); } else { mode='Work'; remaining = workDuration; } start(); } startBtn?.addEventListener('click', start); pauseBtn?.addEventListener('click', pause); resetBtn?.addEventListener('click', reset); update(); const items = storage.get('sb-focus-checklist', []); function renderChecklist(){ if (!checklistList) return; checklistList.innerHTML = items.map((it, i)=>`
		<li class="flex items-center justify-between p-2 rounded-xl border border-gray-200 dark:border-gray-700">
			<label class="flex items-center space-x-2">
				<input type="checkbox" data-i="${i}" ${it.done?'checked':''} class="rounded">
				<span class="${it.done?'line-through text-gray-500':''}">${it.text}</span>
			</label>
			<button data-i="${i}" class="text-red-500 delete-item">Delete</button>
		</li>`).join(''); $$('input[type="checkbox"]', checklistList).forEach(cb => cb.addEventListener('change', (e)=>{ const i = Number(e.currentTarget.getAttribute('data-i')); items[i].done = e.currentTarget.checked; storage.set('sb-focus-checklist', items); renderChecklist(); })); $$('.delete-item', checklistList).forEach(btn => btn.addEventListener('click', (e)=>{ const i = Number(e.currentTarget.getAttribute('data-i')); items.splice(i,1); storage.set('sb-focus-checklist', items); renderChecklist(); })); } checklistForm?.addEventListener('submit', (e)=>{ e.preventDefault(); const val = checklistForm.item.value.trim(); if (!val) return; items.push({ text: val, done:false }); storage.set('sb-focus-checklist', items); checklistForm.reset(); renderChecklist(); }); renderChecklist(); if (pledge) { pledge.value = storage.get('sb-study-pledge', 'I commit to focused and consistent study.'); pledge.addEventListener('input', ()=> storage.set('sb-study-pledge', pledge.value)); } breathing && breathing.classList.add('breathing'); }

	// Review
	function initReview(){ if (document.body.getAttribute('data-page') !== 'review') return; enforceFeatureGate(); const sessions = storage.get('sb-sessions', []); const goals = storage.get('sb-goals', []); const ctx1 = $('#chartSessionsPerDay')?.getContext('2d'); if (ctx1 && window.Chart){ const dayMap = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']; const counts = dayMap.map(d => sessions.filter(s=>s.day===d).length); new Chart(ctx1, { type: 'bar', data: { labels: dayMap, datasets: [{ label: 'Sessions', data: counts, backgroundColor: '#818CF8' }] }, options: { responsive: true, plugins: { legend: { display: false } } } }); } const ctx2 = $('#chartGoalsProgress')?.getContext('2d'); if (ctx2 && window.Chart){ const labels = goals.map(g=>g.title); const pct = goals.map(g => g.target ? Math.round((g.progress/g.target)*100) : 0); new Chart(ctx2, { type: 'doughnut', data: { labels, datasets: [{ data: pct, backgroundColor: ['#A5B4FC','#F59E0B','#34D399','#F472B6','#60A5FA','#F87171'] }] }, options: { plugins: { legend: { position: 'bottom' } } } }); } }

	// Resources
	function initResources(){ if (document.body.getAttribute('data-page') !== 'resources') return; enforceFeatureGate(); const notes = storage.get('sb-notes', []); const links = storage.get('sb-bookmarks', []); const notesList = $('#notesList'); const notesInput = $('#notesUpload'); const bookmarkForm = $('#bookmarkForm'); const linksList = $('#linksList'); function renderNotes(){ if (!notesList) return; notesList.innerHTML = notes.map((n,i)=>`
		<li class="p-3 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-between">
			<div class="truncate"><span class="font-medium">${n.name}</span> <span class="text-sm text-gray-500">(${n.date})</span></div>
			<div class="space-x-2">
				${n.dataUrl ? `<a class="btn-secondary" href="${n.dataUrl}" download="${n.name}">Download</a>` : ''}
				<button class="text-red-500" data-i="${i}">Delete</button>
			</div>
		</li>`).join(''); $$('button[data-i]', notesList).forEach(btn => btn.addEventListener('click', (e)=>{ const i = Number(e.currentTarget.getAttribute('data-i')); notes.splice(i,1); storage.set('sb-notes', notes); renderNotes(); })); } function renderLinks(){ if (!linksList) return; linksList.innerHTML = links.map((l,i)=>`
		<li class="p-3 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-between">
			<a class="text-primary-600 truncate" href="${l.url}" target="_blank" rel="noopener">${l.title}</a>
			<button class="text-red-500" data-i="${i}">Delete</button>
		</li>`).join(''); $$('button[data-i]', linksList).forEach(btn => btn.addEventListener('click', (e)=>{ const i = Number(e.currentTarget.getAttribute('data-i')); links.splice(i,1); storage.set('sb-bookmarks', links); renderLinks(); })); } notesInput?.addEventListener('change', async (e)=>{ const file = e.target.files[0]; if (!file) return; if (file.type !== 'application/pdf') { alert('Please upload a PDF file.'); return; } const reader = new FileReader(); reader.onload = ()=>{ notes.push({ name: file.name, date: new Date().toLocaleDateString(), dataUrl: reader.result }); storage.set('sb-notes', notes); renderNotes(); }; reader.readAsDataURL(file); }); bookmarkForm?.addEventListener('submit', (e)=>{ e.preventDefault(); const title = bookmarkForm.title.value.trim(); let url = bookmarkForm.url.value.trim(); if (!title || !url) return; if (!/^https?:\/\//i.test(url)) url = 'https://' + url; links.push({ title, url }); storage.set('sb-bookmarks', links); bookmarkForm.reset(); renderLinks(); }); renderNotes(); renderLinks(); }

	// Flashcards
	function initFlashcards(){ if (document.body.getAttribute('data-page') !== 'flashcards') return; enforceFeatureGate(); const cards = storage.get('sb-flashcards', []); const list = $('#flashcardsGrid'); const form = $('#flashForm'); function uid(){ return 'f_' + Math.random().toString(36).slice(2,9); } function render(){ if (!list) return; list.innerHTML = cards.map((c,i)=>`
		<div class="flashcard hover-lift bg-white/70 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 cursor-pointer" data-i="${i}">
			<div class="flashcard-inner">
				<div class="flashcard-face grid place-items-center">${c.front}</div>
				<div class="flashcard-face flashcard-back grid place-items-center bg-primary-50 dark:bg-primary-900/20">${c.back}</div>
			</div>
			<div class="mt-3 flex justify-end"><button data-i="${i}" class="text-red-500 delete-card">Delete</button></div>
		</div>`).join(''); $$('.flashcard', list).forEach(card => card.addEventListener('click', (e)=>{ if (e.target.classList.contains('delete-card')) return; card.classList.toggle('flipped'); })); $$('.delete-card', list).forEach(btn => btn.addEventListener('click', (e)=>{ e.stopPropagation(); const i = Number(e.currentTarget.getAttribute('data-i')); cards.splice(i,1); storage.set('sb-flashcards', cards); render(); })); } form?.addEventListener('submit', (e)=>{ e.preventDefault(); const front = form.front.value.trim(); const back = form.back.value.trim(); if (!front || !back) return; cards.push({ id: uid(), front, back }); storage.set('sb-flashcards', cards); form.reset(); render(); }); render(); }

	// Feedback
	function initFeedback(){ if (document.body.getAttribute('data-page') !== 'feedback') return; enforceFeatureGate(); const form = $('#feedbackForm'); const toast = $('#feedbackToast'); form?.addEventListener('submit', (e)=>{ e.preventDefault(); const name = form.name.value.trim(); const email = form.email.value.trim(); const message = form.message.value.trim(); const validEmail = /.+@.+\..+/.test(email); if (!name || !validEmail || message.length < 10) { alert('Please provide a valid name, email, and a message of at least 10 characters.'); return; } const submissions = storage.get('sb-feedback', []); submissions.push({ name, email, message, date: new Date().toISOString() }); storage.set('sb-feedback', submissions); form.reset(); if (toast) { toast.classList.remove('hidden'); setTimeout(()=> toast.classList.add('hidden'), 2500); } }); }

	// Settings
	function initSettings(){ if (document.body.getAttribute('data-page') !== 'settings') return; const features = getFeatures(); ['schedule','goals','focus','review','resources','flashcards','feedback'].forEach(key=>{ const el = $(`#ft-${key}`); if (!el) return; el.checked = !!features[key]; el.addEventListener('change', ()=>{ features[key] = el.checked; setFeatures(features); renderNavbar(); }); }); const form = $('#profileForm'); const img = $('#profilePreview'); const data = storage.get('sb-profile', { firstName:'', lastName:'', email:'', address:'', city:'', state:'', contact:'', avatar:null }); form.firstName.value = data.firstName||''; form.lastName.value = data.lastName||''; form.email.value = data.email||''; form.address.value = data.address||''; form.city.value = data.city||''; form.state.value = data.state||''; form.contact.value = data.contact||''; if (data.avatar) img.src = data.avatar; $('#avatarInput')?.addEventListener('change', (e)=>{ const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload=()=>{ img.src=r.result; data.avatar=r.result; storage.set('sb-profile', data); }; r.readAsDataURL(f); }); form.addEventListener('input', ()=>{ data.firstName=form.firstName.value; data.lastName=form.lastName.value; data.email=form.email.value; data.address=form.address.value; data.city=form.city.value; data.state=form.state.value; data.contact=form.contact.value; storage.set('sb-profile', data); }); $('#changePasswordForm')?.addEventListener('submit', (e)=>{ e.preventDefault(); const p1 = e.target.newPassword.value; const p2 = e.target.confirmPassword.value; if (p1.length<6) { alert('Password too short.'); return; } if (p1!==p2) { alert('Passwords do not match.'); return; } alert('Password updated (demo).'); e.target.reset(); }); const themeSwitch = $('#settingsTheme'); themeSwitch.checked = document.documentElement.classList.contains('dark'); themeSwitch.addEventListener('change', toggleTheme); const wm = $('#workMinutes'); const bm = $('#breakMinutes'); if (wm && bm) { wm.value = storage.get('sb-focus-work', 25); bm.value = storage.get('sb-focus-break', 5); wm.addEventListener('input', ()=>{ const v = Math.max(1, Number(wm.value)||25); storage.set('sb-focus-work', v); }); bm.addEventListener('input', ()=>{ const v = Math.max(1, Number(bm.value)||5); storage.set('sb-focus-break', v); }); } $('#settingsLogoutBtn')?.addEventListener('click', doLogout); }

	// Bootstrap
	initTheme();
	requireAuth();
	renderNavbar();
	enforceFeatureGate();
	initLogin();
	initDashboard();
	initSchedule();
	initGoals();
	initFocus();
	initReview();
	initResources();
	initFlashcards();
	initFeedback();
	initSettings();
})();
