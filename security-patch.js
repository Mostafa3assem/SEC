/* ==========================================================================
   SEC ASSEM — Security & Reliability Patch
   Version: 1.1.0
   Load AFTER app.js

   Goals:
   - Reduce DOM XSS exposure
   - Harden dynamic output
   - Validate user-controlled network targets
   - Fix JWT Base64URL decoding
   - Improve password generation
   - Fix report-generator HTML injection
   - Fix misleading HTTP security-header analysis
   - Reduce command-injection risk in generated shell/Nmap commands
   ========================================================================== */

(() => {
    'use strict';

    if (!window.SecAssem) {
        console.error('[SEC ASSEM] app.js must be loaded before security-patch.js');
        return;
    }

    const App = window.SecAssem;

    /* ======================================================================
       SECURITY UTILITIES
       ====================================================================== */

    const Security = {
        escapeHtml(value) {
            return String(value ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        },

        escapeAttribute(value) {
            return this.escapeHtml(value)
                .replace(/`/g, '&#96;');
        },

        safeFilename(value, fallback = 'sec-assem-output') {
            const result = String(value ?? '')
                .normalize('NFKC')
                .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
                .replace(/\.\.+/g, '.')
                .replace(/\s+/g, '_')
                .replace(/^_+|_+$/g, '')
                .slice(0, 120);

            return result || fallback;
        },

        normalizeDomain(value) {
            return String(value ?? '')
                .trim()
                .toLowerCase()
                .replace(/\.$/, '');
        },

        isHostname(value) {
            const host = this.normalizeDomain(value);

            if (!host || host.length > 253) return false;

            const labels = host.split('.');

            return labels.every(label =>
                label.length >= 1 &&
                label.length <= 63 &&
                /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label)
            );
        },

        isIPv4(value) {
            const parts = String(value ?? '').trim().split('.');

            if (parts.length !== 4) return false;

            return parts.every(part => {
                if (!/^\d{1,3}$/.test(part)) return false;

                const num = Number(part);

                return (
                    Number.isInteger(num) &&
                    num >= 0 &&
                    num <= 255 &&
                    String(num) === part.replace(/^0+(?=\d)/, '')
                );
            });
        },

        isIPv6(value) {
            const input = String(value ?? '').trim();

            if (!input.includes(':')) return false;

            /*
             * Browser URL parser gives us a reliable-enough syntax check
             * without shipping a large IPv6 parser.
             */
            try {
                const url = new URL(`http://[${input}]/`);
                return url.hostname.length > 0;
            } catch {
                return false;
            }
        },

        isCIDR(value) {
            const match = String(value ?? '').trim().match(/^(.+)\/(\d{1,3})$/);

            if (!match) return false;

            const host = match[1];
            const prefix = Number(match[2]);

            if (this.isIPv4(host)) {
                return prefix >= 0 && prefix <= 32;
            }

            if (this.isIPv6(host)) {
                return prefix >= 0 && prefix <= 128;
            }

            return false;
        },

        isNetworkTarget(value) {
            const input = String(value ?? '').trim();

            return (
                this.isIPv4(input) ||
                this.isIPv6(input) ||
                this.isCIDR(input) ||
                this.isHostname(input)
            );
        },

        isPort(value) {
            if (!/^\d{1,5}$/.test(String(value ?? '').trim())) return false;

            const port = Number(value);

            return Number.isInteger(port) && port >= 1 && port <= 65535;
        },

        parseHttpUrl(value) {
            const input = String(value ?? '').trim();

            try {
                const url = new URL(input);

                if (url.protocol !== 'http:' && url.protocol !== 'https:') {
                    return null;
                }

                if (!url.hostname) return null;

                return url;
            } catch {
                return null;
            }
        },

        isEmail(value) {
            const email = String(value ?? '').trim();

            if (email.length > 254) return false;

            return /^[^\s@]{1,64}@[A-Za-z0-9.-]+\.[A-Za-z]{2,63}$/.test(email);
        },

        base64UrlDecode(value) {
            let normalized = String(value ?? '')
                .replace(/-/g, '+')
                .replace(/_/g, '/');

            while (normalized.length % 4 !== 0) {
                normalized += '=';
            }

            const binary = atob(normalized);
            const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));

            return new TextDecoder().decode(bytes);
        },

        base64Utf8(value) {
            const bytes = new TextEncoder().encode(String(value ?? ''));

            let binary = '';

            for (const byte of bytes) {
                binary += String.fromCharCode(byte);
            }

            return btoa(binary);
        },

        randomInt(maxExclusive) {
            if (!Number.isSafeInteger(maxExclusive) || maxExclusive <= 0) {
                throw new RangeError('maxExclusive must be a positive integer');
            }

            const RANGE = 0x100000000;
            const limit = RANGE - (RANGE % maxExclusive);
            const random = new Uint32Array(1);

            do {
                crypto.getRandomValues(random);
            } while (random[0] >= limit);

            return random[0] % maxExclusive;
        },

        secureShuffle(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = this.randomInt(i + 1);

                [array[i], array[j]] = [array[j], array[i]];
            }

            return array;
        },

        textWithBreaks(value) {
            return this.escapeHtml(value).replace(/\r?\n/g, '<br>');
        },

        validateDorkKeyword(value) {
            const keyword = String(value ?? '').trim();

            /*
             * Avoid embedding arbitrary quote/event-handler syntax into
             * the legacy HTML renderer until it is fully componentized.
             */
            if (!keyword) return '';

            if (keyword.length > 100) return null;

            if (!/^[\p{L}\p{N}\s._:@/+\-]+$/u.test(keyword)) {
                return null;
            }

            return keyword;
        }
    };

    App.security = Security;

    /*
     * Keep original API name, but use a deterministic escaping implementation.
     */
    App.escapeHtml = value => Security.escapeHtml(value);

    /* ======================================================================
       SAFE TOAST
       ====================================================================== */

    App.showToast = function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');

        if (!container) return;

        const allowedTypes = new Set([
            'success',
            'error',
            'warning',
            'info'
        ]);

        const safeType = allowedTypes.has(type) ? type : 'info';

        const icons = {
            success: '✓',
            error: '✗',
            warning: '⚠',
            info: 'ℹ'
        };

        const toast = document.createElement('div');
        toast.className = `toast toast-${safeType}`;
        toast.setAttribute('role', safeType === 'error' ? 'alert' : 'status');

        const icon = document.createElement('span');
        icon.className = 'toast-icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = icons[safeType];

        const text = document.createElement('span');
        text.className = 'toast-msg';
        text.textContent = String(message ?? '');

        toast.append(icon, text);
        container.appendChild(toast);

        const dismiss = () => {
            toast.classList.add('toast-exit');

            window.setTimeout(() => {
                toast.remove();
            }, 350);
        };

        window.setTimeout(dismiss, 4000);
    };

    /* ======================================================================
       SAFE MODAL
       ====================================================================== */

    App.showModal = function showModal(title, content) {
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');
        const overlay = document.getElementById('modal-overlay');

        if (!modalTitle || !modalBody || !overlay) return;

        modalTitle.textContent = String(title ?? '');
        modalBody.replaceChildren();

        if (content instanceof Node) {
            modalBody.appendChild(content);
        } else {
            const pre = document.createElement('pre');
            pre.className = 'code-block';
            pre.textContent = String(content ?? '');
            modalBody.appendChild(pre);
        }

        overlay.classList.add('active');
    };

    App.closeModal = function closeModal() {
        document.getElementById('modal-overlay')?.classList.remove('active');
    };

    /* ======================================================================
       CLIPBOARD
       ====================================================================== */

    App.copyToClipboard = async function copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(String(text ?? ''));
            App.showToast('Copied to clipboard!', 'success');
        } catch {
            App.showToast('Clipboard permission denied', 'error');
        }
    };

    /* ======================================================================
       SAFER DOWNLOAD
       ====================================================================== */

    App.downloadFile = function downloadFile(
        filename,
        content,
        mime = 'text/plain;charset=utf-8'
    ) {
        const safeName = Security.safeFilename(filename);
        const blob = new Blob([String(content ?? '')], { type: mime });
        const url = URL.createObjectURL(blob);

        const anchor = document.createElement('a');

        anchor.href = url;
        anchor.download = safeName;
        anchor.style.display = 'none';

        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();

        window.setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 1000);
    };

    /* ======================================================================
       PAYLOAD OUTPUT WITHOUT INLINE JAVASCRIPT
       ====================================================================== */

    App.makePayloadList = function makePayloadList(payloads, title) {
        const values = Array.isArray(payloads)
            ? payloads.map(value => String(value))
            : [];

        const copyAll = Security.escapeAttribute(values.join('\n'));

        let html = `
            <div class="payload-list-header">
                <h4>${Security.escapeHtml(title)}</h4>
                <button
                    type="button"
                    class="btn-secondary btn-sm js-copy-value"
                    data-copy-value="${copyAll}"
                >
                    📋 Copy All
                </button>
            </div>

            <div class="payload-list">
        `;

        values.forEach(value => {
            html += `
                <div class="payload-item">
                    <code>${Security.escapeHtml(value)}</code>

                    <button
                        type="button"
                        class="copy-btn js-copy-value"
                        data-copy-value="${Security.escapeAttribute(value)}"
                        aria-label="Copy payload"
                        title="Copy"
                    >
                        📋
                    </button>
                </div>
            `;
        });

        html += '</div>';

        return html;
    };

    /*
     * Event delegation means generated output no longer requires inline
     * onclick handlers.
     */
    document.addEventListener('click', event => {
        const copyButton = event.target.closest('.js-copy-value');

        if (copyButton) {
            App.copyToClipboard(copyButton.dataset.copyValue || '');
        }
    });

    /* ======================================================================
       SEARCH FIX
       ====================================================================== */

    App.setupSearch = function setupSearch() {
        const input = document.getElementById('tool-search');

        if (!input) return;

        input.addEventListener('input', () => {
            const query = input.value.trim().toLocaleLowerCase();

            document.querySelectorAll('.nav-category').forEach(category => {
                let matchCount = 0;

                category.querySelectorAll('.nav-item').forEach(item => {
                    const matches =
                        !query ||
                        item.textContent.toLocaleLowerCase().includes(query);

                    item.hidden = !matches;

                    if (matches) matchCount++;
                });

                category.hidden = query.length > 0 && matchCount === 0;

                if (query) {
                    category.classList.toggle('expanded', matchCount > 0);
                }
            });
        });
    };

    /* ======================================================================
       VALIDATION WRAPPERS
       ====================================================================== */

    function wrapTool(toolName, validator) {
        const original = App.tools[toolName];

        if (typeof original !== 'function') return;

        App.tools[toolName] = function wrappedTool(...args) {
            const error = validator();

            if (error) {
                App.showToast(error, 'warning');
                return;
            }

            return original.apply(this, args);
        };
    }

    wrapTool('whoisLookup', () => {
        const value =
            document.getElementById('whois-lookup-domain')?.value.trim() || '';

        if (
            !Security.isIPv4(value) &&
            !Security.isIPv6(value) &&
            !Security.isHostname(value)
        ) {
            return 'Enter a valid domain or IP address';
        }

        return null;
    });

    wrapTool('dnsLookup', () => {
        const value =
            document.getElementById('dns-lookup-domain')?.value.trim() || '';

        return Security.isHostname(value)
            ? null
            : 'Enter a valid domain name';
    });

    wrapTool('ipGeo', () => {
        const value =
            document.getElementById('ip-geo-ip')?.value.trim() || '';

        return (
            Security.isIPv4(value) ||
            Security.isIPv6(value)
        )
            ? null
            : 'Enter a valid IP address';
    });

    wrapTool('reverseDns', () => {
        const value =
            document.getElementById('reverse-dns-ip')?.value.trim() || '';

        /*
         * Existing implementation creates in-addr.arpa and therefore only
         * implements IPv4 PTR conversion.
         */
        return Security.isIPv4(value)
            ? null
            : 'Reverse DNS currently supports IPv4 addresses only';
    });

    wrapTool('subdomainFinder', () => {
        const value =
            document.getElementById('subdomain-finder-domain')?.value.trim() || '';

        return Security.isHostname(value)
            ? null
            : 'Enter a valid domain name';
    });

    wrapTool('emailValidator', () => {
        const value =
            document.getElementById('email-validator-email')?.value.trim() || '';

        return Security.isEmail(value)
            ? null
            : 'Enter a valid email address';
    });

    wrapTool('techLookup', () => {
        const value =
            document.getElementById('tech-lookup-url')?.value.trim() || '';

        return Security.parseHttpUrl(value)
            ? null
            : 'Enter a valid HTTP or HTTPS URL';
    });

    /* ======================================================================
       HEADER ANALYZER FIX

       Important:
       Fetching through AllOrigins and inspecting r.headers analyzes
       AllOrigins headers, NOT the target website headers.
       ====================================================================== */

    App.tools.headerAnalyzer = async function headerAnalyzer() {
        const input =
            document.getElementById('header-analyzer-url')?.value.trim() || '';

        const output = document.getElementById('header-analyzer-results');
        const target = Security.parseHttpUrl(input);

        if (!target) {
            App.showToast('Enter a valid HTTP or HTTPS URL', 'warning');
            return;
        }

        App.showLoading('header-analyzer-results');

        const checks = [
            {
                header: 'content-security-policy',
                label: 'Content-Security-Policy',
                weight: 25
            },
            {
                header: 'strict-transport-security',
                label: 'Strict-Transport-Security',
                weight: 20
            },
            {
                header: 'x-content-type-options',
                label: 'X-Content-Type-Options',
                weight: 15
            },
            {
                header: 'referrer-policy',
                label: 'Referrer-Policy',
                weight: 10
            },
            {
                header: 'permissions-policy',
                label: 'Permissions-Policy',
                weight: 10
            },
            {
                header: 'cross-origin-opener-policy',
                label: 'Cross-Origin-Opener-Policy',
                weight: 10
            },
            {
                header: 'cross-origin-resource-policy',
                label: 'Cross-Origin-Resource-Policy',
                weight: 5
            },
            {
                header: 'x-frame-options',
                label: 'X-Frame-Options',
                weight: 5
            }
        ];

        try {
            let response;

            try {
                response = await fetch(target.href, {
                    method: 'HEAD',
                    mode: 'cors',
                    redirect: 'follow',
                    cache: 'no-store'
                });
            } catch {
                response = await fetch(target.href, {
                    method: 'GET',
                    mode: 'cors',
                    redirect: 'follow',
                    cache: 'no-store'
                });
            }

            let score = 0;

            let html = `
                <div class="result-header">
                    <h4>
                        Security Header Analysis —
                        ${Security.escapeHtml(target.href)}
                    </h4>
                </div>

                <div class="security-note">
                    Results below are based only on headers exposed to this
                    browser by the target response.
                </div>

                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Header</th>
                            <th>Value</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            checks.forEach(check => {
                const value = response.headers.get(check.header);
                const present = Boolean(value);

                if (present) score += check.weight;

                html += `
                    <tr>
                        <td>
                            <strong>${check.label}</strong>
                        </td>

                        <td>
                            ${
                                present
                                    ? `<code>${Security.escapeHtml(value)}</code>`
                                    : '—'
                            }
                        </td>

                        <td>
                            <span class="badge ${
                                present ? 'severity-low' : 'severity-high'
                            }">
                                ${present ? '✓ Present' : '✗ Missing / Not Exposed'}
                            </span>
                        </td>
                    </tr>
                `;
            });

            html += `
                    </tbody>
                </table>
            `;

            const scoreClass =
                score >= 80
                    ? 'severity-low'
                    : score >= 50
                        ? 'severity-medium'
                        : 'severity-high';

            html = `
                <div class="score-badge ${scoreClass}">
                    Observable Security Score: ${score}/100
                </div>
            ` + html;

            html += `
                <details class="result-details">
                    <summary>Response Headers Exposed to Browser</summary>

                    <table class="data-table">
                        <tbody>
            `;

            response.headers.forEach((value, name) => {
                html += `
                    <tr>
                        <td>
                            <strong>${Security.escapeHtml(name)}</strong>
                        </td>

                        <td>
                            <code>${Security.escapeHtml(value)}</code>
                        </td>
                    </tr>
                `;
            });

            html += `
                        </tbody>
                    </table>
                </details>
            `;

            output.innerHTML = html;
        } catch (error) {
            output.replaceChildren();

            const wrapper = document.createElement('div');
            wrapper.className = 'browser-limit-card';

            const title = document.createElement('h4');
            title.textContent = 'Browser CORS Limitation';

            const text = document.createElement('p');
            text.textContent =
                'The target does not expose its response headers to this browser. ' +
                'A browser-only application cannot reliably inspect arbitrary ' +
                'website security headers without a backend service.';

            const command = document.createElement('pre');
            command.className = 'code-block';
            command.textContent = `curl -sS -D - -o /dev/null ${target.href}`;

            wrapper.append(title, text, command);
            output.appendChild(wrapper);

            App.showToast(
                'Target headers are not accessible due to browser CORS rules',
                'warning'
            );
        }
    };

    /* ======================================================================
       NMAP COMMAND GENERATOR HARDENING
       ====================================================================== */

    App.tools.generateNmap = function generateNmap() {
        const input =
            document.getElementById('port-scanner-target')?.value.trim() || '';

        const output = document.getElementById('port-scanner-nmap');

        if (!Security.isNetworkTarget(input)) {
            App.showToast(
                'Enter a valid hostname, IP address, or CIDR range',
                'warning'
            );
            return;
        }

        const commands = [
            `nmap -sV -T4 ${input}`,
            `nmap -sS -sV -sC -p- ${input}`,
            `nmap -sV -sC --top-ports 1000 ${input}`,
            `nmap -sU -sV --top-ports 100 ${input}`,
            `nmap -A -T4 -p- ${input}`,
            `nmap -sS -T2 -f -D RND:5 ${input}`,
            `nmap -sV --script=vuln ${input}`,
            `nmap -O -sV ${input}`
        ];

        output.innerHTML = App.makePayloadList(
            commands,
            `Nmap Commands — ${input}`
        );
    };

    /* ======================================================================
       REVERSE SHELL INPUT HARDENING

       We keep your existing shell templates unchanged but prevent input from
       becoming a second shell command in generated output.
       ====================================================================== */

    const originalReverseShell = App.tools.revshellGenerator;

    if (typeof originalReverseShell === 'function') {
        App.tools.revshellGenerator = function patchedReverseShell() {
            const host =
                document.getElementById('revshell-generator-ip')?.value.trim() || '';

            const port =
                document.getElementById('revshell-generator-port')?.value.trim() || '';

            if (
                !Security.isIPv4(host) &&
                !Security.isIPv6(host) &&
                !Security.isHostname(host)
            ) {
                App.showToast(
                    'Enter a valid listener IP address or hostname',
                    'warning'
                );
                return;
            }

            if (!Security.isPort(port)) {
                App.showToast(
                    'Listener port must be between 1 and 65535',
                    'warning'
                );
                return;
            }

            return originalReverseShell.apply(this, arguments);
        };
    }

    /* ======================================================================
       SSRF GENERATOR VALIDATION
       ====================================================================== */

    const originalSsrfGenerator = App.tools.ssrfGenerator;

    if (typeof originalSsrfGenerator === 'function') {
        App.tools.ssrfGenerator = function patchedSsrfGenerator() {
            const host =
                document.getElementById('ssrf-generator-ip')?.value.trim() ||
                '127.0.0.1';

            const port =
                document.getElementById('ssrf-generator-port')?.value.trim() ||
                '80';

            if (
                !Security.isIPv4(host) &&
                !Security.isHostname(host)
            ) {
                App.showToast(
                    'Enter a valid IPv4 address or hostname',
                    'warning'
                );
                return;
            }

            if (!Security.isPort(port)) {
                App.showToast(
                    'Port must be between 1 and 65535',
                    'warning'
                );
                return;
            }

            return originalSsrfGenerator.apply(this, arguments);
        };
    }

    /* ======================================================================
       OPEN REDIRECT GENERATOR VALIDATION
       ====================================================================== */

    const originalRedirectGenerator = App.tools.redirectGenerator;

    if (typeof originalRedirectGenerator === 'function') {
        App.tools.redirectGenerator = function patchedRedirectGenerator() {
            const value =
                document.getElementById('redirect-generator-url')?.value.trim() ||
                'https://evil.com';

            if (!Security.parseHttpUrl(value)) {
                App.showToast(
                    'Redirect destination must be an HTTP or HTTPS URL',
                    'warning'
                );
                return;
            }

            return originalRedirectGenerator.apply(this, arguments);
        };
    }

    /* ======================================================================
       JWT DECODER FIX
       ====================================================================== */

    App.tools.jwtDecoder = function jwtDecoder() {
        const token =
            document.getElementById('jwt-decoder-token')?.value.trim() || '';

        const output = document.getElementById('jwt-decoder-results');

        if (!token) {
            App.showToast('Please enter a JWT token', 'warning');
            return;
        }

        try {
            const parts = token.split('.');

            if (parts.length !== 3) {
                throw new Error('JWT must contain exactly three segments');
            }

            const header = JSON.parse(
                Security.base64UrlDecode(parts[0])
            );

            const payload = JSON.parse(
                Security.base64UrlDecode(parts[1])
            );

            let expiry = '';

            if (Number.isFinite(Number(payload.exp))) {
                const expiryDate = new Date(Number(payload.exp) * 1000);

                if (!Number.isNaN(expiryDate.getTime())) {
                    const expired = expiryDate.getTime() < Date.now();

                    expiry = `
                        <div class="jwt-status">
                            <span class="badge ${
                                expired
                                    ? 'severity-critical'
                                    : 'severity-low'
                            }">
                                ${
                                    expired
                                        ? 'EXPIRED'
                                        : 'NOT EXPIRED'
                                }
                            </span>

                            <span>
                                ${Security.escapeHtml(expiryDate.toISOString())}
                            </span>
                        </div>
                    `;
                }
            }

            let issuedAt = '';

            if (Number.isFinite(Number(payload.iat))) {
                const date = new Date(Number(payload.iat) * 1000);

                if (!Number.isNaN(date.getTime())) {
                    issuedAt = `
                        <p>
                            <strong>Issued At:</strong>
                            ${Security.escapeHtml(date.toISOString())}
                        </p>
                    `;
                }
            }

            output.innerHTML = `
                <div class="result-header">
                    <h4>JWT Decoded</h4>
                </div>

                <div class="security-note">
                    Decoding a JWT does not verify its cryptographic signature.
                </div>

                ${expiry}
                ${issuedAt}

                <h4>Header</h4>

                <pre class="code-block json">${
                    Security.escapeHtml(
                        JSON.stringify(header, null, 2)
                    )
                }</pre>

                <h4>Payload</h4>

                <pre class="code-block json">${
                    Security.escapeHtml(
                        JSON.stringify(payload, null, 2)
                    )
                }</pre>

                <h4>Signature</h4>

                <pre class="code-block">${
                    Security.escapeHtml(parts[2])
                }</pre>
            `;
        } catch (error) {
            App.showToast(
                `JWT decode failed: ${error.message}`,
                'error'
            );

            output.textContent = '';

            const message = document.createElement('p');

            message.className = 'no-results';
            message.textContent = `Invalid JWT: ${error.message}`;

            output.appendChild(message);
        }
    };

    /* ======================================================================
       PASSWORD GENERATOR FIX

       Original:
         randomUint32 % charset.length

       That introduces modulo bias.

       New:
       - rejection sampling
       - guarantees every selected class occurs
       - secure Fisher-Yates shuffle
       ====================================================================== */

    App.tools.passwordGenerator = function passwordGenerator() {
        const rawLength =
            Number(
                document.getElementById('password-generator-length')?.value
            );

        const quantity = Math.min(
            50,
            Math.max(
                1,
                Number(
                    document.getElementById('password-generator-qty')?.value
                ) || 5
            )
        );

        const length = Math.min(
            256,
            Math.max(4, rawLength || 16)
        );

        const excludeAmbiguous =
            Boolean(
                document.getElementById(
                    'password-generator-exclude'
                )?.checked
            );

        const sets = [];

        if (
            document.getElementById(
                'password-generator-upper'
            )?.checked
        ) {
            sets.push(
                excludeAmbiguous
                    ? 'ABCDEFGHJKLMNPQRSTUVWXYZ'
                    : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
            );
        }

        if (
            document.getElementById(
                'password-generator-lower'
            )?.checked
        ) {
            sets.push(
                excludeAmbiguous
                    ? 'abcdefghjkmnpqrstuvwxyz'
                    : 'abcdefghijklmnopqrstuvwxyz'
            );
        }

        if (
            document.getElementById(
                'password-generator-numbers'
            )?.checked
        ) {
            sets.push(
                excludeAmbiguous
                    ? '23456789'
                    : '0123456789'
            );
        }

        if (
            document.getElementById(
                'password-generator-symbols'
            )?.checked
        ) {
            sets.push('!@#$%^&*()_+-=[]{}|;:,.<>?');
        }

        if (!sets.length) {
            App.showToast(
                'Select at least one character type',
                'warning'
            );
            return;
        }

        if (length < sets.length) {
            App.showToast(
                `Password length must be at least ${sets.length}`,
                'warning'
            );
            return;
        }

        const charset = [...new Set(sets.join(''))].join('');

        const randomCharacter = set => {
            return set[Security.randomInt(set.length)];
        };

        const passwords = [];

        for (let index = 0; index < quantity; index++) {
            const characters = [];

            /*
             * One character from every selected category.
             */
            sets.forEach(set => {
                characters.push(randomCharacter(set));
            });

            /*
             * Fill remaining characters from the complete charset.
             */
            while (characters.length < length) {
                characters.push(randomCharacter(charset));
            }

            Security.secureShuffle(characters);

            passwords.push(characters.join(''));
        }

        const theoreticalEntropy =
            length * Math.log2(charset.length);

        const output =
            document.getElementById('password-generator-results');

        output.innerHTML = App.makePayloadList(
            passwords,
            `Generated Passwords — approximately ${
                Math.floor(theoreticalEntropy)
            } bits maximum theoretical entropy`
        );

        App.showToast(
            `Generated ${quantity} password${
                quantity === 1 ? '' : 's'
            }`,
            'success'
        );
    };

    /* ======================================================================
       DORK GENERATOR LEGACY INPUT HARDENING
       ====================================================================== */

    const originalDorkGenerator = App.tools.dorkGenerator;

    if (typeof originalDorkGenerator === 'function') {
        App.tools.dorkGenerator = function patchedDorkGenerator() {
            const domainInput =
                document.getElementById('dork-generator-domain');

            const keywordInput =
                document.getElementById('dork-generator-keyword');

            const domain = domainInput?.value.trim() || '';
            const keyword = keywordInput?.value.trim() || '';

            if (!Security.isHostname(domain)) {
                App.showToast(
                    'Enter a valid target domain',
                    'warning'
                );
                return;
            }

            const validatedKeyword =
                Security.validateDorkKeyword(keyword);

            if (validatedKeyword === null) {
                App.showToast(
                    'Custom keyword contains unsupported characters',
                    'warning'
                );
                return;
            }

            return originalDorkGenerator.apply(this, arguments);
        };
    }

    /* ======================================================================
       WORDLIST GENERATOR — SAFE RENDERING
       ====================================================================== */

    App.tools.wordlistGenerator = function wordlistGenerator() {
        const textarea =
            document.getElementById('wordlist-generator-words');

        const output =
            document.getElementById('wordlist-generator-results');

        const baseWords = (textarea?.value || '')
            .split(/\r?\n/)
            .map(value => value.trim())
            .filter(Boolean)
            .slice(0, 500);

        if (!baseWords.length) {
            App.showToast('Please enter base words', 'warning');
            return;
        }

        const options = {
            numbers:
                document.getElementById(
                    'wordlist-generator-numbers'
                )?.checked,

            special:
                document.getElementById(
                    'wordlist-generator-special'
                )?.checked,

            leet:
                document.getElementById(
                    'wordlist-generator-leet'
                )?.checked,

            capitalize:
                document.getElementById(
                    'wordlist-generator-capitalize'
                )?.checked,

            years:
                document.getElementById(
                    'wordlist-generator-years'
                )?.checked,

            reverse:
                document.getElementById(
                    'wordlist-generator-reverse'
                )?.checked,

            double:
                document.getElementById(
                    'wordlist-generator-double'
                )?.checked
        };

        const words = new Set();

        const add = value => {
            /*
             * Defensive limits to prevent freezing the UI with unexpectedly
             * huge generated strings.
             */
            if (
                typeof value === 'string' &&
                value.length > 0 &&
                value.length <= 256 &&
                words.size < 100000
            ) {
                words.add(value);
            }
        };

        baseWords.forEach(word => {
            add(word);
            add(word.toLowerCase());
            add(word.toUpperCase());

            if (options.capitalize) {
                add(
                    word.charAt(0).toUpperCase() +
                    word.slice(1).toLowerCase()
                );
            }

            if (options.reverse) {
                add([...word].reverse().join(''));
            }

            if (options.double) {
                add(word + word);
            }

            if (options.leet) {
                const leet = word
                    .replace(/a/gi, '4')
                    .replace(/e/gi, '3')
                    .replace(/i/gi, '1')
                    .replace(/o/gi, '0')
                    .replace(/s/gi, '5')
                    .replace(/t/gi, '7');

                add(leet);

                if (options.capitalize) {
                    add(
                        leet.charAt(0).toUpperCase() +
                        leet.slice(1)
                    );
                }
            }

            if (options.numbers) {
                for (let i = 0; i <= 99; i++) {
                    add(`${word}${i}`);
                }

                for (let i = 0; i <= 9; i++) {
                    add(`${i}${word}`);
                }

                [
                    123,
                    1234,
                    12345,
                    321,
                    111,
                    666,
                    777,
                    888,
                    999
                ].forEach(number => {
                    add(`${word}${number}`);
                });
            }

            if (options.special) {
                [
                    '!',
                    '@',
                    '#',
                    '$',
                    '%',
                    '&',
                    '*',
                    '!@#',
                    '!!',
                    '!1',
                    '@1',
                    '#1',
                    '123!'
                ].forEach(symbol => {
                    add(`${word}${symbol}`);
                });
            }

            if (options.years) {
                /*
                 * Do not hardcode an end year that becomes stale.
                 */
                const currentYear = new Date().getFullYear();

                for (
                    let year = 2020;
                    year <= currentYear + 1;
                    year++
                ) {
                    add(`${word}${year}`);
                    add(`${year}${word}`);
                }
            }
        });

        const list = [...words];
        const preview = list.slice(0, 100);

        output.replaceChildren();

        const header = document.createElement('div');
        header.className = 'result-header';

        const title = document.createElement('h4');
        title.textContent =
            `Wordlist Generated: ${list.length} entries`;

        const download = document.createElement('button');

        download.type = 'button';
        download.className = 'btn-secondary btn-sm';
        download.textContent = '⬇ Download .txt';

        download.addEventListener('click', () => {
            App.downloadFile(
                'wordlist.txt',
                list.join('\n'),
                'text/plain;charset=utf-8'
            );
        });

        header.append(title, download);

        const info = document.createElement('p');
        info.textContent =
            `Showing first ${preview.length} of ${list.length} entries`;

        const listContainer = document.createElement('div');
        listContainer.className = 'payload-list';

        preview.forEach(word => {
            const row = document.createElement('div');
            row.className = 'payload-item';

            const code = document.createElement('code');
            code.textContent = word;

            row.appendChild(code);
            listContainer.appendChild(row);
        });

        if (list.length > preview.length) {
            const more = document.createElement('div');
            more.className = 'payload-item';

            const text = document.createElement('em');
            text.textContent =
                `... and ${list.length - preview.length} more`;

            more.appendChild(text);
            listContainer.appendChild(more);
        }

        output.append(header, info, listContainer);

        App.showToast(
            `Generated ${list.length} words`,
            'success'
        );
    };

    /* ======================================================================
       REPORT GENERATOR
       ====================================================================== */

    function collectReportData() {
        const value = id =>
            document.getElementById(id)?.value.trim() || '';

        const findings = [];

        document.querySelectorAll('.finding-card').forEach(card => {
            findings.push({
                title:
                    card.querySelector('.finding-title')?.value.trim() ||
                    'Untitled Finding',

                severity:
                    card.querySelector('.finding-severity')?.value ||
                    'Medium',

                cvss:
                    card.querySelector('.finding-cvss')?.value ||
                    'N/A',

                description:
                    card.querySelector('.finding-desc')?.value.trim() ||
                    '',

                impact:
                    card.querySelector('.finding-impact')?.value.trim() ||
                    '',

                assets:
                    card.querySelector('.finding-assets')?.value.trim() ||
                    '',

                steps:
                    card.querySelector('.finding-steps')?.value.trim() ||
                    '',

                remediation:
                    card.querySelector(
                        '.finding-remediation'
                    )?.value.trim() ||
                    '',

                references:
                    card.querySelector('.finding-refs')?.value.trim() ||
                    ''
            });
        });

        return {
            client:
                value('report-generator-client') ||
                'Client',

            project:
                value('report-generator-project') ||
                'Penetration Test',

            tester:
                value('report-generator-tester') ||
                'Security Tester',

            start:
                value('report-generator-date-start') ||
                'N/A',

            end:
                value('report-generator-date-end') ||
                'N/A',

            scope:
                value('report-generator-scope') ||
                'N/A',

            summary:
                value('report-generator-summary') ||
                'N/A',

            findings
        };
    }

    function buildReportHtml(data) {
        const e = Security.escapeHtml;
        const multiline = Security.textWithBreaks;

        const severityColors = {
            Critical: '#ef4444',
            High: '#f97316',
            Medium: '#eab308',
            Low: '#22c55e',
            Info: '#3b82f6',
            Informational: '#3b82f6'
        };

        const counts = {
            Critical: 0,
            High: 0,
            Medium: 0,
            Low: 0,
            Informational: 0
        };

        data.findings.forEach(finding => {
            const severity =
                finding.severity === 'Info'
                    ? 'Informational'
                    : finding.severity;

            if (Object.prototype.hasOwnProperty.call(counts, severity)) {
                counts[severity]++;
            }
        });

        const reportDate =
            new Date().toISOString().slice(0, 10);

        const overviewRows = Object.entries(counts)
            .map(([severity, count]) => `
                <tr>
                    <td>
                        <span
                            class="severity-badge"
                            style="background:${
                                severityColors[severity]
                            }"
                        >
                            ${e(severity)}
                        </span>
                    </td>

                    <td>${count}</td>
                </tr>
            `)
            .join('');

        const chart = Object.entries(counts)
            .map(([severity, count]) => `
                <div class="bar">
                    <div class="bar-count">${count}</div>

                    <div
                        class="bar-fill"
                        style="
                            height:${Math.max(
                                Math.min(count * 24, 100),
                                4
                            )}px;
                            background:${
                                severityColors[severity]
                            };
                        "
                    ></div>

                    <div class="bar-label">
                        ${e(severity)}
                    </div>
                </div>
            `)
            .join('');

        const findingHtml = data.findings.length
            ? data.findings
                .map((finding, index) => {
                    const severity =
                        finding.severity === 'Info'
                            ? 'Informational'
                            : finding.severity;

                    const color =
                        severityColors[severity] ||
                        severityColors.Informational;

                    return `
                        <article
                            class="finding"
                            style="border-left-color:${color}"
                        >
                            <h4>
                                ${index + 1}.
                                ${e(finding.title)}
                            </h4>

                            <div class="finding-meta">
                                <span
                                    class="severity-badge"
                                    style="background:${color}"
                                >
                                    ${e(severity)}
                                </span>

                                <span>
                                    CVSS:
                                    <strong>${e(finding.cvss)}</strong>
                                </span>
                            </div>

                            <p>
                                <strong>Description:</strong>
                                ${multiline(finding.description || 'N/A')}
                            </p>

                            <p>
                                <strong>Impact:</strong>
                                ${multiline(finding.impact || 'N/A')}
                            </p>

                            <p>
                                <strong>Affected Assets:</strong>
                                ${multiline(finding.assets || 'N/A')}
                            </p>

                            <p>
                                <strong>Steps to Reproduce:</strong>
                                <br>
                                ${multiline(finding.steps || 'N/A')}
                            </p>

                            <p>
                                <strong>Remediation:</strong>
                                ${multiline(finding.remediation || 'N/A')}
                            </p>

                            ${
                                finding.references
                                    ? `
                                        <p>
                                            <strong>References:</strong>
                                            ${multiline(
                                                finding.references
                                            )}
                                        </p>
                                    `
                                    : ''
                            }
                        </article>
                    `;
                })
                .join('')
            : '<p>No findings were entered.</p>';

        return `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">

    <meta
        name="viewport"
        content="width=device-width,initial-scale=1"
    >

    <meta
        name="robots"
        content="noindex,nofollow,noarchive"
    >

    <title>
        SEC ASSEM Pentest Report — ${e(data.client)}
    </title>

    <style>
        *,
        *::before,
        *::after {
            box-sizing: border-box;
        }

        html {
            color-scheme: dark;
        }

        body {
            margin: 0;
            padding: 40px;
            background: #0a0e17;
            color: #e2e8f0;
            font-family:
                Inter,
                "Segoe UI",
                system-ui,
                -apple-system,
                BlinkMacSystemFont,
                sans-serif;
            line-height: 1.65;
        }

        .container {
            width: min(100%, 960px);
            margin: 0 auto;
        }

        .header {
            padding: 44px 24px;
            text-align: center;
            border-bottom: 2px solid #00d4aa;
        }

        .header h1 {
            margin: 0 0 8px;
            color: #00d4aa;
            font-size: 34px;
        }

        .header h2 {
            margin: 0;
            color: #94a3b8;
            font-size: 20px;
            font-weight: 500;
        }

        .section {
            margin: 30px 0;
            padding: 24px;
            background: #111827;
            border: 1px solid #1e293b;
            border-radius: 12px;
        }

        .section h3 {
            margin: 0 0 18px;
            padding-bottom: 10px;
            border-bottom: 1px solid #1e293b;
            color: #00d4aa;
            font-size: 20px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        th,
        td {
            padding: 11px 14px;
            text-align: left;
            vertical-align: top;
            border-bottom: 1px solid #1e293b;
        }

        th {
            width: 220px;
            background: #1a2332;
            color: #94a3b8;
        }

        .severity-badge {
            display: inline-block;
            padding: 4px 11px;
            border-radius: 999px;
            color: #fff;
            font-size: 12px;
            font-weight: 700;
        }

        .finding {
            margin: 22px 0;
            padding: 20px;
            background: #1a2332;
            border-left: 4px solid #00d4aa;
            border-radius: 8px;
            overflow-wrap: anywhere;
        }

        .finding h4 {
            margin: 0 0 12px;
            font-size: 18px;
        }

        .finding-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 14px;
            align-items: center;
            margin-bottom: 14px;
        }

        .finding p {
            color: #cbd5e1;
        }

        .finding strong {
            color: #f1f5f9;
        }

        .bar-chart {
            display: flex;
            gap: 12px;
            align-items: end;
            height: 150px;
            margin: 20px 0;
        }

        .bar {
            flex: 1;
            min-width: 80px;
            text-align: center;
        }

        .bar-fill {
            width: 42px;
            margin: 0 auto;
            border-radius: 6px 6px 0 0;
        }

        .bar-count {
            margin-bottom: 5px;
            font-weight: 800;
        }

        .bar-label {
            margin-top: 8px;
            color: #94a3b8;
            font-size: 12px;
        }

        .footer {
            margin-top: 36px;
            padding: 28px 20px;
            border-top: 1px solid #1e293b;
            color: #64748b;
            text-align: center;
        }

        @media print {
            @page {
                margin: 14mm;
            }

            html {
                color-scheme: light;
            }

            body {
                padding: 0;
                background: #fff;
                color: #111827;
            }

            .section {
                break-inside: avoid;
                background: #fff;
                border-color: #d1d5db;
            }

            .finding {
                break-inside: avoid;
                background: #f8fafc;
                color: #111827;
            }

            .finding p,
            .finding strong {
                color: #111827;
            }

            th {
                background: #f1f5f9;
                color: #334155;
            }
        }
    </style>
</head>

<body>
    <main class="container">
        <header class="header">
            <h1>SEC ASSEM</h1>
            <h2>Penetration Test Report</h2>
        </header>

        <section class="section">
            <h3>Project Information</h3>

            <table>
                <tbody>
                    <tr>
                        <th>Client</th>
                        <td>${e(data.client)}</td>
                    </tr>

                    <tr>
                        <th>Project</th>
                        <td>${e(data.project)}</td>
                    </tr>

                    <tr>
                        <th>Tester</th>
                        <td>${e(data.tester)}</td>
                    </tr>

                    <tr>
                        <th>Assessment Period</th>
                        <td>${e(data.start)} — ${e(data.end)}</td>
                    </tr>

                    <tr>
                        <th>Report Date</th>
                        <td>${reportDate}</td>
                    </tr>
                </tbody>
            </table>
        </section>

        <section class="section">
            <h3>Scope</h3>
            <p>${multiline(data.scope)}</p>
        </section>

        <section class="section">
            <h3>Executive Summary</h3>

            <p>${multiline(data.summary)}</p>

            <h4>Findings Overview</h4>

            <div class="bar-chart">
                ${chart}
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Severity</th>
                        <th>Count</th>
                    </tr>
                </thead>

                <tbody>
                    ${overviewRows}

                    <tr>
                        <th>Total</th>
                        <td>${data.findings.length}</td>
                    </tr>
                </tbody>
            </table>
        </section>

        <section class="section">
            <h3>Detailed Findings</h3>
            ${findingHtml}
        </section>

        <footer class="footer">
            <p>
                Generated by
                <strong>SEC ASSEM</strong>
                Cybersecurity Toolkit
            </p>

            <p>
                Confidential security assessment material.
            </p>
        </footer>
    </main>
</body>
</html>`;
    }

    App.tools.generateReport = function generateReport() {
        const data = collectReportData();
        const html = buildReportHtml(data);

        const date =
            new Date().toISOString().slice(0, 10);

        const client =
            Security.safeFilename(
                data.client,
                'Client'
            );

        App.downloadFile(
            `Pentest_Report_${client}_${date}.html`,
            html,
            'text/html;charset=utf-8'
        );

        App.showToast(
            'Secure report generated successfully',
            'success'
        );

        const result =
            document.getElementById('report-generator-results');

        if (result) {
            result.textContent = '';

            const message =
                document.createElement('p');

            message.className = 'result-success';
            message.textContent =
                '✓ Report generated and downloaded.';

            result.appendChild(message);
        }
    };

    App.tools.previewReport = function previewReport() {
        const data = collectReportData();
        const html = buildReportHtml(data);

        const iframe =
            document.createElement('iframe');

        iframe.className = 'report-preview-frame';
        iframe.setAttribute(
            'sandbox',
            ''
        );

        iframe.setAttribute(
            'title',
            'Pentest report preview'
        );

        /*
         * Empty sandbox prevents scripts from executing if something is ever
         * accidentally introduced into the generated report.
         */
        iframe.srcdoc = html;

        App.showModal(
            'Pentest Report Preview',
            iframe
        );
    };

    /* ======================================================================
       MODAL ESCAPE KEY
       ====================================================================== */

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            App.closeModal();
        }
    });

    /* ======================================================================
       UI ACCESSIBILITY ENHANCEMENTS
       ====================================================================== */

    function enhanceAccessibility() {
        document.querySelectorAll('.nav-item').forEach(item => {
            if (!item.hasAttribute('tabindex')) {
                item.tabIndex = 0;
            }

            if (!item.hasAttribute('role')) {
                item.setAttribute('role', 'button');
            }

            item.addEventListener('keydown', event => {
                if (
                    event.key === 'Enter' ||
                    event.key === ' '
                ) {
                    event.preventDefault();
                    item.click();
                }
            });
        });

        document.querySelectorAll('.nav-category-header').forEach(header => {
            if (!header.hasAttribute('tabindex')) {
                header.tabIndex = 0;
            }

            if (!header.hasAttribute('role')) {
                header.setAttribute('role', 'button');
            }

            header.addEventListener('keydown', event => {
                if (
                    event.key === 'Enter' ||
                    event.key === ' '
                ) {
                    event.preventDefault();
                    header.click();
                }
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            enhanceAccessibility,
            { once: true }
        );
    } else {
        enhanceAccessibility();
    }

    console.info(
        '[SEC ASSEM] Security patch v1.1.0 loaded successfully'
    );
})();
