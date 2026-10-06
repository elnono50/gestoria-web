(() => {
    const root = document.documentElement;
    root.classList.remove('no-js');

    document.addEventListener('DOMContentLoaded', () => {
        const header = document.querySelector('.header');
        const hamburger = document.querySelector('.hamburger');
        const navMenu = document.querySelector('.nav-menu');
        const form = document.getElementById('formulario-contacto');
        const year = document.getElementById('current-year');

        if (year) year.textContent = String(new Date().getFullYear());

        /* ---------- Años de experiencia: suben solos cada 1 de septiembre ---------- */
        const aniosDesde = (iso) => {
            const [y, m, d] = iso.split('-').map(Number);
            const hoy = new Date();
            let anios = hoy.getFullYear() - y;
            const mes = hoy.getMonth() + 1;
            if (mes < m || (mes === m && hoy.getDate() < d)) anios -= 1;
            return Math.max(anios, 0);
        };

        document.querySelectorAll('[data-years-since]').forEach((el) => {
            const anios = aniosDesde(el.dataset.yearsSince);
            el.textContent = String(anios);
            if (el.dataset.target) el.dataset.target = String(anios);
        });

        /* ---------- Header al hacer scroll ---------- */
        const updateHeader = () => header && header.classList.toggle('is-scrolled', window.scrollY > 24);
        updateHeader();
        window.addEventListener('scroll', updateHeader, { passive: true });

        /* ---------- Menú mobile ---------- */
        const setMenu = (open) => {
            if (!hamburger || !navMenu) return;
            navMenu.classList.toggle('active', open);
            hamburger.classList.toggle('active', open);
            hamburger.setAttribute('aria-expanded', String(open));
            hamburger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
        };

        if (hamburger && navMenu) {
            hamburger.addEventListener('click', () => setMenu(!navMenu.classList.contains('active')));
            navMenu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
            document.addEventListener('click', (e) => {
                if (!navMenu.contains(e.target) && !hamburger.contains(e.target)) setMenu(false);
            });
            document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
        }

        /* ---------- Aparición al hacer scroll ---------- */
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const reveals = document.querySelectorAll('.reveal');

        if (reduceMotion || !('IntersectionObserver' in window)) {
            reveals.forEach((el) => el.classList.add('is-visible'));
        } else {
            const io = new IntersectionObserver((entries, obs) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    entry.target.classList.add('is-visible');
                    obs.unobserve(entry.target);
                });
            }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

            reveals.forEach((el, i) => {
                // pequeño escalonado entre elementos hermanos
                const siblings = el.parentElement ? [...el.parentElement.children].filter((c) => c.classList.contains('reveal')) : [];
                const idx = siblings.indexOf(el);
                if (idx > 0) el.style.transitionDelay = `${Math.min(idx, 4) * 90}ms`;
                io.observe(el);
            });
        }

        /* ---------- WhatsApp flotante: se oculta mientras el formulario está en pantalla ---------- */
        const waFloat = document.querySelector('.wa-float');
        const formBox = document.querySelector('.contacto-form');
        if (waFloat && formBox && 'IntersectionObserver' in window) {
            new IntersectionObserver(([entry]) => {
                waFloat.classList.toggle('is-hidden', entry.isIntersecting);
            }, { threshold: 0.15 }).observe(formBox);
        }

        /* ---------- Contadores ---------- */
        const animateCounter = (el) => {
            const target = Number(el.dataset.target || 0);
            const suffix = el.dataset.suffix || '';
            if (!target || reduceMotion) return;
            const duration = 1400;
            const start = performance.now();
            const tick = (now) => {
                const p = Math.min((now - start) / duration, 1);
                el.textContent = `${Math.round(target * (1 - Math.pow(1 - p, 3)))}${suffix}`;
                if (p < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        };

        const numbers = document.querySelectorAll('.number[data-target]');
        if (numbers.length && 'IntersectionObserver' in window) {
            const counterIO = new IntersectionObserver((entries, obs) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    animateCounter(entry.target);
                    obs.unobserve(entry.target);
                });
            }, { threshold: 0.6 });
            numbers.forEach((n) => counterIO.observe(n));
        }

        /* ---------- Notificaciones ---------- */
        const cerrarNotificacion = (n) => {
            if (!n || !n.isConnected) return;
            n.classList.add('salida');
            setTimeout(() => n.remove(), 300);
        };

        const mostrarNotificacion = (mensaje, tipo = 'info') => {
            document.querySelectorAll('.notificacion').forEach((n) => n.remove());

            const n = document.createElement('div');
            n.className = `notificacion notificacion-${tipo}`;
            n.setAttribute('role', tipo === 'error' ? 'alert' : 'status');

            const texto = document.createElement('span');
            texto.textContent = mensaje; // textContent: evita inyección de HTML

            const cerrar = document.createElement('button');
            cerrar.type = 'button';
            cerrar.className = 'notificacion-close';
            cerrar.setAttribute('aria-label', 'Cerrar notificación');
            cerrar.textContent = '×';
            cerrar.addEventListener('click', () => cerrarNotificacion(n));

            n.append(texto, cerrar);
            document.body.appendChild(n);
            setTimeout(() => cerrarNotificacion(n), 6000);
        };

        /* ---------- Formulario ---------- */
        const validarEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 120;
        const cargadoEn = Date.now();
        const ESPERA_MINIMA_MS = 3000;   // los bots completan en milisegundos
        const ENFRIAMIENTO_MS = 30000;   // evita envíos repetidos seguidos
        let ultimoEnvio = 0;

        if (form) {
            form.addEventListener('submit', async (event) => {
                event.preventDefault();

                // Anti-spam: campo trampa completado o envío demasiado rápido → se descarta en silencio
                if (form.elements['_gotcha'].value || Date.now() - cargadoEn < ESPERA_MINIMA_MS) {
                    mostrarNotificacion('¡Consulta enviada con éxito!', 'success');
                    form.reset();
                    return;
                }

                if (Date.now() - ultimoEnvio < ENFRIAMIENTO_MS) {
                    mostrarNotificacion('Su consulta ya fue enviada. Aguarde unos segundos antes de enviar otra.', 'info');
                    return;
                }

                const nombre = form.nombre.value.trim();
                const email = form.email.value.trim();
                const servicio = form.servicio.value;
                const mensaje = form.mensaje.value.trim();

                if (!nombre || !email || !servicio || !mensaje) {
                    mostrarNotificacion('Por favor, complete todos los campos obligatorios.', 'error');
                    return;
                }

                if (nombre.length > 100 || mensaje.length > 2000) {
                    mostrarNotificacion('El texto ingresado es demasiado largo.', 'error');
                    return;
                }

                const telefono = form.telefono.value.trim();
                if (telefono && !/^[0-9+()\s-]{6,30}$/.test(telefono)) {
                    mostrarNotificacion('Por favor, ingrese un teléfono válido.', 'error');
                    form.telefono.focus();
                    return;
                }

                if (!validarEmail(email)) {
                    mostrarNotificacion('Por favor, ingrese un email válido.', 'error');
                    form.email.focus();
                    return;
                }

                const boton = form.querySelector('button[type="submit"]');
                const htmlOriginal = boton.innerHTML;
                boton.textContent = 'Enviando…';
                boton.disabled = true;

                try {
                    const response = await fetch(form.action, {
                        method: 'POST',
                        body: new FormData(form),
                        headers: { Accept: 'application/json' }
                    });

                    if (!response.ok) throw new Error(`HTTP ${response.status}`);

                    mostrarNotificacion(`¡Consulta enviada con éxito! Diego E. Comatto le responderá pronto a su email: ${email}`, 'success');
                    form.reset();
                    ultimoEnvio = Date.now();
                } catch (error) {
                    console.error('Error en el formulario:', error);
                    mostrarNotificacion('Hubo un error al enviar el mensaje. Puede escribir directamente por WhatsApp: +54 9 11 6658-2361 o email: comattodiegogestor@gmail.com', 'error');
                } finally {
                    boton.innerHTML = htmlOriginal;
                    boton.disabled = false;
                }
            });
        }
    });
})();
