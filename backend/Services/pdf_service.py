import io
from jinja2 import Template
from weasyprint import HTML

def generate_pdf_from_dict(data: dict) -> io.BytesIO:
    """
    Rapor verisini HTML/CSS şablonuna basarak SSL erişilebilirlik alanı
    dahil olacak şekilde PDF akışına dönüştürür.
    """
    html_template = """
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            @font-face {
                font-family: 'ArialCustom';
                src: url('file:///C:/Windows/Fonts/arial.ttf');
            }
            @font-face {
                font-family: 'ArialCustom';
                src: url('file:///C:/Windows/Fonts/arialbd.ttf');
                font-weight: bold;
            }

            @page {
                size: A4 portrait;
                margin: 1.2cm;
            }
            body {
                font-family: 'ArialCustom', sans-serif;
                color: #2d3748;
                font-size: 8pt;
            }
            h1 {
                color: #1a365d;
                font-size: 15pt;
                border-bottom: 2px solid #2b6cb0;
                padding-bottom: 4px;
                margin-bottom: 6px;
            }
            h2 {
                color: #2c5282;
                font-size: 10.5pt;
                background-color: #ebf8ff;
                padding: 5px;
                border-left: 4px solid #3182ce;
                margin-top: 10px;
                margin-bottom: 8px;
            }
            .meta-info {
                font-size: 8pt;
                color: #4a5568;
                margin-bottom: 10px;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 6px;
                margin-bottom: 12px;
            }
            th {
                background-color: #2b6cb0;
                color: white;
                font-size: 7pt;
                padding: 5px;
                text-align: left;
            }
            td {
                border: 1px solid #cbd5e0;
                padding: 4px;
                font-size: 6.5pt;
                vertical-align: middle;
                word-wrap: break-word;
            }
            tr:nth-child(even) {
                background-color: #f7fafc;
            }
            .badge-danger {
                color: #c53030;
                font-weight: bold;
            }
            .badge-success {
                color: #2f855a;
                font-weight: bold;
            }
            .link-text {
                color: #3182ce;
                text-decoration: none;
                font-size: 6pt;
            }
        </style>
    </head>
    <body>
        <h1>KAPSAMLI TEHDİT RAPORU</h1>
        <div class="meta-info">
            <strong>Rapor Tarihi:</strong> {{ data.tarih }}<br>
            <strong>Aranan Kelimeler:</strong> {{ data.sorgulanan_kelimeler | join(', ') }}
        </div>

        <!-- 1. GÖRSEL VE LOGO TARAMALARI -->
        <h2>1. Görsel & Logo Taramaları</h2>
        {% for kw, gorsel in data.gorsel_tarama_sonuclari.items() %}
            <p><strong>Arama Kelimesi:</strong> {{ kw }} | <strong>Taranan Görsel:</strong> {{ gorsel.taranan_gorsel_sayisi }} | <strong>Tespit Edilen Logo:</strong> {{ gorsel.logo_tespit_edilen_gorsel_sayisi }}</p>
            {% if gorsel.analiz_sonuclari %}
            <table>
                <thead>
                    <tr>
                        <th style="width: 11%;">Motor</th>
                        <th style="width: 16%;">Site Adı</th>
                        <th style="width: 11%;">Domain Yaşı</th>
                        <th style="width: 6%;">Logo</th>
                        <th style="width: 24%;">Durum</th>
                        <th style="width: 12%;">VT Analiz</th>
                        <th style="width: 20%;">Bağlantılar</th>
                    </tr>
                </thead>
                <tbody>
                    {% for item in gorsel.analiz_sonuclari %}
                    <tr>
                        <td>{{ item.tespit_edildigi_motor }}</td>
                        <td><strong>{{ item.site_adi }}</strong></td>
                        <td>{{ item.domain_yasi }}</td>
                        <td style="text-align: center;"><strong>{{ item.bulunan_logo_sayisi }}</strong></td>
                        <td class="badge-danger">{{ item.durum }}</td>
                        <td>
                            {% if item.virustotal_analiz and item.virustotal_analiz.zararli_sayisi is defined %}
                                {% if item.virustotal_analiz.zararli_sayisi > 0 %}
                                    <span class="badge-danger">{{ item.virustotal_analiz.zararli_sayisi }} Engelleme</span>
                                {% else %}
                                    <span class="badge-success">Temiz</span>
                                {% endif %}
                            {% else %}
                                {{ item.virustotal_analiz.mesaj if item.virustotal_analiz and item.virustotal_analiz.mesaj else 'Yok' }}
                            {% endif %}
                        </td>
                        <td>
                            {% if item.kaynak_sayfa %}
                                <a href="{{ item.kaynak_sayfa }}" class="link-text" target="_blank">Kaynak Sayfa</a><br>
                            {% endif %}
                            {% if item.gorsel_linki %}
                                <a href="{{ item.gorsel_linki }}" class="link-text" target="_blank">Görsel Linki</a>
                            {% endif %}
                        </td>
                    </tr>
                    {% endfor %}
                </tbody>
            </table>
            {% else %}
            <p style="color: #2f855a; font-size: 8pt;">Şüpheli görsel veya taklit logosu barındıran site bulunamadı.</p>
            {% endif %}
        {% endfor %}

        <!-- 2. SSL & CRT.SH TARAMALARI -->
        <h2>2. SSL Sertifika & CRT.sh Taramaları</h2>
        {% for kw, ssl_list in data.ssl_crt_sonuclari.results.items() %}
            <p><strong>Kelime Filtresi:</strong> {{ kw }}</p>
            {% if ssl_list %}
            <table>
                <thead>
                    <tr>
                        <th style="width: 30%;">Domain</th>
                        <th style="width: 15%;">Domain Yaşı</th>
                        <th style="width: 25%;">VirusTotal Analizi</th>
                        <th style="width: 30%;">Erişilebilirlik</th>
                    </tr>
                </thead>
                <tbody>
                    {% for item in ssl_list %}
                    <tr>
                        <td><strong>{{ item.domain }}</strong></td>
                        <td>{{ item.domain_yasi if item.domain_yasi is string or item.domain_yasi is number else item.domain_yasi.error if item.domain_yasi.error else 'Yok' }}</td>
                        <td>
                            {% if item.virustotal and item.virustotal.zararli_sayisi is defined %}
                                {% if item.virustotal.zararli_sayisi > 0 %}
                                    <span class="badge-danger">{{ item.virustotal.zararli_sayisi }} Engelleme/Uyarı</span>
                                {% else %}
                                    <span class="badge-success">Temiz</span>
                                {% endif %}
                            {% else %}
                                Bilgi Yok
                            {% endif %}
                        </td>
                        <td>
                            {% if item.erisilebilirlik %}
                                {% if item.erisilebilirlik.durum %}
                                    <strong>{{ item.erisilebilirlik.durum }}</strong>
                                {% elif item.erisilebilirlik.status_code %}
                                    HTTP: {{ item.erisilebilirlik.status_code }}
                                {% else %}
                                    {{ item.erisilebilirlik }}
                                {% endif %}
                            {% else %}
                                Bilgi Yok
                            {% endif %}
                        </td>
                    </tr>
                    {% endfor %}
                </tbody>
            </table>
            {% else %}
            <p style="color: #2f855a; font-size: 8pt;">Bu kelimeye ait şüpheli SSL kaydı tespit edilmedi.</p>
            {% endif %}
        {% endfor %}

        <!-- 3. FAVICON & HTML TARAMALARI -->
        <h2>3. Favicon & HTML / urlscan Taramaları</h2>
        {% if data.favicon_html_sonuclari.results %}
        <table>
            <thead>
                <tr>
                    <th style="width: 50%;">URL</th>
                    <th style="width: 25%;">HTTP Durumu</th>
                    <th style="width: 25%;">Erişilebilirlik</th>
                </tr>
            </thead>
            <tbody>
                {% for res in data.favicon_html_sonuclari.results %}
                <tr>
                    <td>{{ res.url if res.url else 'Belirtilmedi' }}</td>
                    <td>{{ res.status_code if res.status_code else 'N/A' }}</td>
                    <td>{{ res.durum if res.durum else 'Aktif' }}</td>
                </tr>
                {% endfor %}
            </tbody>
        </table>
        {% else %}
        <p style="color: #2f855a; font-size: 8pt;">Aktif zararlı URL kaydı bulunamadı.</p>
        {% endif %}

    </body>
    </html>
    """

    template = Template(html_template)
    rendered_html = template.render(data=data)

    pdf_buffer = io.BytesIO()
    HTML(string=rendered_html).write_pdf(pdf_buffer)

    pdf_buffer.seek(0)
    return pdf_buffer
