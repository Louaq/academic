// 程序性滚动期间不记录滚动位置
let isProgrammaticScroll = false;

function saveScrollPosition(y) {
    sessionStorage.setItem('scrollPosition', String(y));
}

// 统一的滚动跳转：导航、移动菜单、前进/后退、回到顶部共用
function scrollToTarget(targetId) {
    let top = 0;
    if (targetId !== '#home') {
        const targetElement = document.querySelector(targetId);
        if (!targetElement) return;
        const nav = document.querySelector('.top-nav');
        const navHeight = nav ? nav.offsetHeight : 70;
        top = targetElement.getBoundingClientRect().top + window.pageYOffset - navHeight - 10;
    }

    isProgrammaticScroll = true;
    window.scrollTo({ top: top, behavior: 'smooth' });
    saveScrollPosition(top);
    // 给滚动动画留出时间后再清除标记
    setTimeout(function () {
        isProgrammaticScroll = false;
    }, 1000);
}

function setActiveNavLink(targetId) {
    document.querySelectorAll('.desktop-nav a').forEach(function (link) {
        link.classList.toggle('active', link.getAttribute('href') === targetId);
    });
}

function navigateTo(targetId) {
    scrollToTarget(targetId);
    history.pushState(null, null, targetId);
    setActiveNavLink(targetId);
}

// DOM加载完成后移除滚动锁定并恢复滚动位置（锁定由 index.html 内联脚本添加）
function restoreScrollPosition() {
    const scrollLock = document.getElementById('scroll-lock');
    if (!scrollLock) return;
    clearTimeout(window.__scrollLockTimeout);
    if (window.__savedScrollY > 0) {
        window.scrollTo(0, window.__savedScrollY);
    }
    // 先恢复滚动位置，再通过 rAF 显示页面，避免闪烁
    requestAnimationFrame(function () {
        scrollLock.remove();
    });
}

function updateDeployTime() {
    const el = document.getElementById('last-updated');
    if (!el) return;
    const meta = document.querySelector('meta[name="deploy-time"]');
    const raw = meta && meta.getAttribute('content');
    let d = raw && raw !== '__DEPLOY_ISO__' ? new Date(raw) : null;
    // 占位符未替换或无效时：用文档 Last-Modified，但跳过「≈当前时间」的浏览器兜底值
    if (!d || isNaN(d.getTime())) {
        const lm = new Date(document.lastModified).getTime();
        d = !isNaN(lm) && Math.abs(Date.now() - lm) > 5000 ? new Date(lm) : null;
    }
    el.textContent = d
        ? d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Shanghai' })
        : '—';
}

function setupNavLinks() {
    const navTitle = document.querySelector('.nav-title a');
    if (navTitle) {
        navTitle.addEventListener('click', function (e) {
            e.preventDefault();
            navigateTo('#home');
        });
    }

    document.querySelectorAll('.desktop-nav a').forEach(function (link) {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            navigateTo(this.getAttribute('href'));
        });
    });
}

// 统一的滚动处理器：保存位置、导航高亮、回到顶部按钮
function createScrollHandler() {
    let ticking = false;
    const sections = document.querySelectorAll('section[id]');
    const topNav = document.querySelector('.top-nav');
    const backToTopButton = document.getElementById('backToTop');

    function update() {
        const scrollY = window.pageYOffset;

        if (!isProgrammaticScroll) {
            saveScrollPosition(scrollY);
        }

        // 导航高亮
        if (topNav && sections.length > 0) {
            const navHeight = topNav.offsetHeight;
            let current = '';
            if (scrollY < 100) {
                current = '#home';
            } else {
                sections.forEach(function (section) {
                    const sectionTop = section.offsetTop - navHeight - 10;
                    if (scrollY >= sectionTop && scrollY < sectionTop + section.offsetHeight) {
                        current = '#' + section.id;
                    }
                });
            }
            setActiveNavLink(current);
        }

        if (backToTopButton) {
            backToTopButton.classList.toggle('visible', scrollY > 300);
        }

        ticking = false;
    }

    return function () {
        if (!ticking) {
            requestAnimationFrame(update);
            ticking = true;
        }
    };
}

// 邮件图标：点击复制邮箱地址
function setupEmailCopy() {
    const emailIcon = document.getElementById('emailIcon');
    const emailCopyToast = document.getElementById('emailCopyToast');
    if (!emailIcon || !emailCopyToast) return;

    const emailAddress = 'yangyang@mail.scuec.edu.cn';

    function showToast() {
        emailCopyToast.classList.add('show');
        setTimeout(function () {
            emailCopyToast.classList.remove('show');
        }, 2000);
    }

    // 备用方案：剪贴板 API 不可用时（如非 HTTPS）
    function legacyCopy() {
        const textArea = document.createElement('textarea');
        textArea.value = emailAddress;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (ok) showToast();
    }

    emailIcon.addEventListener('click', function (e) {
        e.preventDefault();
        if (navigator.clipboard) {
            navigator.clipboard.writeText(emailAddress).then(showToast, legacyCopy);
        } else {
            legacyCopy();
        }
    });
}

function init() {
    restoreScrollPosition();
    window.addEventListener('scroll', createScrollHandler(), { passive: true });

    const currentYearElement = document.getElementById('current-year');
    if (currentYearElement) {
        currentYearElement.textContent = new Date().getFullYear();
    }

    updateDeployTime();
    setupNavLinks();
    setupEmailCopy();

    // 浏览器后退/前进
    window.addEventListener('popstate', function () {
        scrollToTarget(window.location.hash || '#home');
    });

    const backToTopButton = document.getElementById('backToTop');
    if (backToTopButton) {
        backToTopButton.addEventListener('click', function () {
            scrollToTarget('#home');
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
