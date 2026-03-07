document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const navbar = document.querySelector('.navbar');
    const contactoForm = document.getElementById('formulario-contacto');
    const currentYear = document.getElementById('current-year');
    const revealElements = document.querySelectorAll('.reveal-on-scroll');
    const statNumbers = document.querySelectorAll('.number');

    if (currentYear) {
        currentYear.textContent = new Date().getFullYear();
    }

    function closeMobileMenu() {
        if (!hamburger || !navMenu) return;
        navMenu.classList.remove('active');
        hamburger.classList.remove('active');
        hamburger.setAttribute('aria-expanded', 'false');
    }

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            const isExpanded = hamburger.getAttribute('aria-expanded') === 'true';
            hamburger.setAttribute('aria-expanded', String(!isExpanded));
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }

    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener('click', (event) => {
            const targetId = anchor.getAttribute('href');
            if (!targetId || targetId === '#') return;

            const target = document.querySelector(targetId);
            if (!target) return;

            event.preventDefault();
            const navbarHeight = navbar ? navbar.offsetHeight : 0;
            const targetPosition = target.getBoundingClientRect().top + window.scrollY - navbarHeight - 16;

            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });

            if (window.innerWidth <= 768) {
                closeMobileMenu();
            }
        });
    });

    document.addEventListener('click', (event) => {
        if (!navMenu || !hamburger) return;
        const clickedInsideMenu = navMenu.contains(event.target);
        const clickedHamburger = hamburger.contains(event.target);

        if (!clickedInsideMenu && !clickedHamburger) {
            closeMobileMenu();
        }
    });

    function updateNavbarState() {
        if (!navbar) return;
        navbar.classList.toggle('navbar-scrolled', window.scrollY > 40);
    }

    updateNavbarState();
    window.addEventListener('scroll', updateNavbarState, { passive: true });

    if (revealElements.length) {
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.12,
            rootMargin: '0px 0px -40px 0px'
        });

        revealElements.forEach((element) => revealObserver.observe(element));
    }

    function animateCounter(element) {
        if (element.dataset.animated === 'true') return;

        const target = Number(element.dataset.target || 0);
        const suffix = element.dataset.suffix || '';
        if (!target) {
            element.dataset.animated = 'true';
            return;
        }

        const duration = 1400;
        const startTime = performance.now();

        element.dataset.animated = 'true';

        function updateCounter(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = 1 - Math.pow(1 - progress, 3);
            const value = Math.round(target * easedProgress);
            element.textContent = `${value}${suffix}`;

            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            } else {
                element.textContent = `${target}${suffix}`;
            }
        }

        requestAnimationFrame(updateCounter);
    }

    if (statNumbers.length) {
        statNumbers.forEach((number) => {
            number.dataset.animated = 'false';
        });

        const counterObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    animateCounter(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.6
        });

        statNumbers.forEach((number) => counterObserver.observe(number));
    }

    function validarEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function cerrarNotificacion(notificacion) {
        if (!notificacion || !notificacion.parentElement) return;
        notificacion.classList.add('salida');
        setTimeout(() => {
            if (notificacion.parentElement) {
                notificacion.remove();
            }
        }, 280);
    }

    function mostrarNotificacion(mensaje, tipo = 'info') {
        document.querySelectorAll('.notificacion').forEach((notif) => notif.remove());

        const notificacion = document.createElement('div');
        notificacion.className = `notificacion notificacion-${tipo}`;
        notificacion.setAttribute('role', 'alert');
        notificacion.setAttribute('aria-live', 'polite');
        notificacion.innerHTML = `
            <span>${mensaje}</span>
            <button type="button" class="notificacion-close" aria-label="Cerrar notificación">&times;</button>
        `;

        const closeButton = notificacion.querySelector('.notificacion-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => cerrarNotificacion(notificacion));
        }

        document.body.appendChild(notificacion);

        window.setTimeout(() => cerrarNotificacion(notificacion), 5000);
    }

    if (contactoForm) {
        contactoForm.addEventListener('submit', async function (event) {
            event.preventDefault();

            const nombre = this.querySelector('input[name="nombre"]').value.trim();
            const email = this.querySelector('input[name="email"]').value.trim();
            const mensaje = this.querySelector('textarea[name="mensaje"]').value.trim();

            if (!nombre || !email || !mensaje) {
                mostrarNotificacion('Por favor, complete todos los campos obligatorios.', 'error');
                return;
            }

            if (!validarEmail(email)) {
                mostrarNotificacion('Por favor, ingrese un email válido.', 'error');
                return;
            }

            const boton = this.querySelector('button[type="submit"]');
            const textoOriginal = boton.textContent;
            boton.textContent = 'Enviando...';
            boton.disabled = true;

            try {
                const formData = new FormData(this);
                const response = await fetch(this.action, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        Accept: 'application/json'
                    }
                });

                if (!response.ok) {
                    let errorMessage = 'Error en el envío';
                    try {
                        const errorData = await response.json();
                        errorMessage = errorData.error || errorMessage;
                    } catch (_) {
                        // Sin acción: mantenemos mensaje por defecto.
                    }
                    throw new Error(errorMessage);
                }

                mostrarNotificacion(`¡Consulta enviada con éxito! Diego E. Comatto le responderá pronto a su email: ${email}`, 'success');
                this.reset();
            } catch (error) {
                console.error('Error en el formulario:', error);
                mostrarNotificacion('Hubo un error al enviar el mensaje. Puede escribir directamente por WhatsApp: +54 9 11 6658-2361 o email: comattodiegogestor@gmail.com', 'error');
            } finally {
                boton.textContent = textoOriginal;
                boton.disabled = false;
            }
        });
    }
});
