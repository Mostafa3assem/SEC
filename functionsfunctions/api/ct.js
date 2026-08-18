export async function onRequestGet(context) {
    const requestUrl = new URL(context.request.url);
    const domain = (requestUrl.searchParams.get('domain') || '')
        .trim()
        .toLowerCase()
        .replace(/\.$/, '');

    const domainRegex =
        /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

    if (!domainRegex.test(domain)) {
        return Response.json(
            {
                success: false,
                error: 'Invalid domain'
            },
            {
                status: 400,
                headers: {
                    'Cache-Control': 'no-store'
                }
            }
        );
    }

    const crtUrl =
        `https://crt.sh/?q=%25.${encodeURIComponent(domain)}&output=json`;

    try {
        const response = await fetch(crtUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'SEC-ASSEM/1.1'
            },
            cf: {
                cacheTtl: 300,
                cacheEverything: true
            }
        });

        if (!response.ok) {
            return Response.json(
                {
                    success: false,
                    error: `crt.sh returned HTTP ${response.status}`
                },
                {
                    status: 502,
                    headers: {
                        'Cache-Control': 'no-store'
                    }
                }
            );
        }

        const raw = await response.text();

        let certificates;

        try {
            certificates = JSON.parse(raw);
        } catch {
            return Response.json(
                {
                    success: false,
                    error: 'crt.sh returned invalid JSON'
                },
                {
                    status: 502,
                    headers: {
                        'Cache-Control': 'no-store'
                    }
                }
            );
        }

        if (!Array.isArray(certificates)) {
            return Response.json(
                {
                    success: false,
                    error: 'Unexpected crt.sh response format'
                },
                {
                    status: 502
                }
            );
        }

        const subdomains = new Set();

        for (const certificate of certificates) {
            const names = String(certificate.name_value || '')
                .split(/\r?\n/);

            for (let name of names) {
                name = name
                    .trim()
                    .toLowerCase()
                    .replace(/^\*\./, '')
                    .replace(/\.$/, '');

                if (!name) {
                    continue;
                }

                /*
                 * Important:
                 * fooexample.com must NOT match example.com.
                 */
                if (
                    name === domain ||
                    name.endsWith(`.${domain}`)
                ) {
                    subdomains.add(name);
                }
            }
        }

        const results = [...subdomains].sort((a, b) =>
            a.localeCompare(b)
        );

        return Response.json(
            {
                success: true,
                domain,
                count: results.length,
                subdomains: results
            },
            {
                status: 200,
                headers: {
                    'Cache-Control':
                        'public, max-age=300, s-maxage=300',
                    'X-Content-Type-Options': 'nosniff'
                }
            }
        );
    } catch (error) {
        return Response.json(
            {
                success: false,
                error: 'Certificate Transparency lookup failed'
            },
            {
                status: 502,
                headers: {
                    'Cache-Control': 'no-store'
                }
            }
        );
    }
}
