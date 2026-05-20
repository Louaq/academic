(function () {

    // 全局变量
    window.isProgrammaticScroll = false;
    let scrollTimeout;

    // 优化的滚动处理
    let ticking = false;
    function handleScrollOptimized() {
        if (window.isProgrammaticScroll) return;

        if (!ticking) {
            requestAnimationFrame(function() {
                sessionStorage.setItem('scrollPosition', window.pageYOffset.toString());
                ticking = false;
            });
            ticking = true;
        }
    }

    // DOM加载完成后的处理
    function handleDOMLoaded() {
        // 移除滚动锁定并恢复滚动位置
        const scrollLock = document.getElementById('scroll-lock');
        if (scrollLock) {
            const scrollY = window.__savedScrollY || 0;
            // 清除兜底超时
            if (window.__scrollLockTimeout) {
                clearTimeout(window.__scrollLockTimeout);
            }
            // 先恢复滚动位置，再通过 rAF 显示页面，避免闪烁
            if (scrollY > 0) {
                window.scrollTo(0, scrollY);
            }
            requestAnimationFrame(function() {
                scrollLock.remove();
            });
        }

        // 添加统一的滚动监听
        window.addEventListener('scroll', createUnifiedScrollHandler(), { passive: true });

        // 启用平滑滚动
        setTimeout(function() {
            document.documentElement.classList.add('smooth-scroll');
        }, 100);
    }

    // 绑定事件
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', handleDOMLoaded);
    } else {
        handleDOMLoaded();
    }
})();
function updateDeployTime() {
    const el = document.getElementById('last-updated');
    if (!el) return;
    const meta = document.querySelector('meta[name="deploy-time"]');
    const raw = meta && meta.getAttribute('content');
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Asia/Shanghai'
    };
    let d = null;
    if (raw && raw !== '__DEPLOY_ISO__') {
        const parsed = new Date(raw);
        if (!isNaN(parsed.getTime())) d = parsed;
    }
    // 占位符未替换时（例如未配置 build）：用文档 Last-Modified，但跳过「≈当前时间」的浏览器兜底值
    if (!d && (!raw || raw === '__DEPLOY_ISO__')) {
        const lm = new Date(document.lastModified).getTime();
        if (!isNaN(lm) && Math.abs(Date.now() - lm) > 5000) {
            d = new Date(lm);
        }
    }
    if (d) {
        el.textContent = d.toLocaleDateString('en-US', options);
    } else {
        el.textContent = '—';
    }
}

function setupSmoothScrolling() {
    const desktopNavLinks = document.querySelectorAll('.desktop-nav a');
    const navTitle = document.querySelector('.nav-title a');

    function scrollToTarget(targetId, smooth = true) {
        // 标记为程序性滚动
        window.isProgrammaticScroll = true;

        if (targetId === '#home') {
            window.scrollTo({
                top: 0,
                behavior: smooth ? 'smooth' : 'auto'
            });
            // 立即保存滚动位置
            sessionStorage.setItem('scrollPosition', '0');
            // 程序性滚动完成后，延迟清除标记（给滚动动画时间）
            setTimeout(function() {
                window.isProgrammaticScroll = false;
            }, smooth ? 300 : 100);
            return;
        }

        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            const nav = document.querySelector('.top-nav');
            const navHeight = nav ? nav.offsetHeight : 70;
            const targetTop = targetElement.getBoundingClientRect().top + window.pageYOffset;
            const scrollPosition = targetTop - navHeight - 10;

            window.scrollTo({
                top: scrollPosition,
                behavior: smooth ? 'smooth' : 'auto'
            });

            // 立即保存目标滚动位置
            sessionStorage.setItem('scrollPosition', scrollPosition.toString());

            // 程序性滚动完成后，延迟清除标记（给滚动动画时间）
            setTimeout(function() {
                window.isProgrammaticScroll = false;
            }, smooth ? 1000 : 100);
        } else {
            // 如果找不到目标元素，立即清除标记
            window.isProgrammaticScroll = false;
        }
    }

    // 处理导航栏标题链接点击事件
    if (navTitle) {
        navTitle.addEventListener('click', function (e) {
            e.preventDefault();
            scrollToTarget('#home');

            history.pushState(null, null, '#home');

            desktopNavLinks.forEach(link => link.classList.remove('active'));
            const homeLink = document.querySelector('.desktop-nav a[href="#home"]');
            if (homeLink) homeLink.classList.add('active');
        });
    }

    desktopNavLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            if (this.getAttribute('href').startsWith('#')) {
                e.preventDefault();
                const targetId = this.getAttribute('href');

                scrollToTarget(targetId);

                history.pushState(null, null, targetId);

                desktopNavLinks.forEach(link => link.classList.remove('active'));
                this.classList.add('active');
            }
        });
    });
}

// 统一的滚动处理器 - 合并所有滚动功能
function createUnifiedScrollHandler() {
    let scrollTicking = false;

    // 缓存DOM元素
    const sections = document.querySelectorAll('section[id], header[id]');
    const desktopNavLinks = document.querySelectorAll('.desktop-nav a');
    const topNav = document.querySelector('.top-nav');
    const navContainer = document.querySelector('.nav-container');
    const navTitle = document.querySelector('.nav-title a');
    const backToTopButton = document.getElementById('backToTop');

    return function() {
        if (!scrollTicking) {
            requestAnimationFrame(function() {
                const scrollY = window.pageYOffset;

                // 保存滚动位置
                if (!window.isProgrammaticScroll) {
                    sessionStorage.setItem('scrollPosition', scrollY.toString());
                }

                // 导航高亮
                if (topNav && sections.length > 0) {
                    const navHeight = topNav.offsetHeight;
                    let current = '';

                    if (scrollY < 100) {
                        current = '#home';
                    } else {
                        sections.forEach(section => {
                            const sectionTop = section.offsetTop - navHeight - 10;
                            const sectionHeight = section.offsetHeight;
                            if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
                                current = '#' + section.getAttribute('id');
                            }
                        });
                    }

                    desktopNavLinks.forEach(link => {
                        link.classList.remove('active');
                        if (link.getAttribute('href') === current) {
                            link.classList.add('active');
                        }
                    });
                }

                // 导航栏滚动效果
                if (topNav && navContainer && navTitle) {
                    if (scrollY > 50) {
                        topNav.classList.add('scrolled');
                        navContainer.classList.add('scrolled');
                        navTitle.classList.add('scrolled');
                    } else {
                        topNav.classList.remove('scrolled');
                        navContainer.classList.remove('scrolled');
                        navTitle.classList.remove('scrolled');
                    }
                }

                // 回到顶部按钮
                if (backToTopButton) {
                    if (scrollY > 300) {
                        backToTopButton.classList.add('visible');
                    } else {
                        backToTopButton.classList.remove('visible');
                    }
                }

                scrollTicking = false;
            });
            scrollTicking = true;
        }
    };
}

function setupMobileMenu() {
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const mobileNav = document.getElementById('mobileNav');
    const mobileNavOverlay = document.getElementById('mobileNavOverlay');
    const mobileNavClose = document.getElementById('mobileNavClose');
    const mobileNavLinks = document.querySelectorAll('.mobile-nav a');

    // 检查必要元素是否存在
    if (!mobileMenuToggle || !mobileNav || !mobileNavOverlay) {
        return;
    }

    // 汉堡菜单点击事件
    mobileMenuToggle.addEventListener('click', function() {
        const icon = mobileMenuToggle.querySelector('i');
        mobileMenuToggle.classList.toggle('active');
        mobileNav.classList.toggle('active');
        mobileNavOverlay.classList.toggle('active');

        // 切换图标和页面滚动
        if (mobileMenuToggle.classList.contains('active')) {
            icon.className = 'fas fa-times';
            document.body.classList.add('mobile-menu-open');
        } else {
            icon.className = 'fas fa-bars';
            document.body.classList.remove('mobile-menu-open');
        }
    });

    // 移动端菜单链接点击事件
    mobileNavLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // 只处理页内链接
            if (this.getAttribute('href').startsWith('#')) {
                e.preventDefault();

                const targetId = this.getAttribute('href');
                const icon = mobileMenuToggle.querySelector('i');
                
                // 关闭移动菜单
                mobileMenuToggle.classList.remove('active');
                mobileNav.classList.remove('active');
                mobileNavOverlay.classList.remove('active');
                document.body.classList.remove('mobile-menu-open');
                icon.className = 'fas fa-bars';

                // 标记为程序性滚动
                window.isProgrammaticScroll = true;

                // 使用统一的滚动函数
                if (targetId === '#home') {
                    window.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                    });
                    // 立即保存滚动位置
                    sessionStorage.setItem('scrollPosition', '0');
                    // 程序性滚动完成后，延迟清除标记（给滚动动画时间）
                    setTimeout(function() {
                        window.isProgrammaticScroll = false;
                    }, 1000);
                } else {
                    const targetElement = document.querySelector(targetId);
                    if (targetElement) {
                        const nav = document.querySelector('.nav-container');
                        const navHeight = nav ? nav.offsetHeight : 60;
                        const targetTop = targetElement.getBoundingClientRect().top + window.pageYOffset;
                        const scrollPosition = targetTop - navHeight - 10;

                        window.scrollTo({
                            top: scrollPosition,
                            behavior: 'smooth'
                        });
                        // 立即保存目标滚动位置
                        sessionStorage.setItem('scrollPosition', scrollPosition.toString());
                        // 程序性滚动完成后，延迟清除标记（给滚动动画时间）
                        setTimeout(function() {
                            window.isProgrammaticScroll = false;
                        }, 1000);
                    } else {
                        // 如果找不到目标元素，立即清除标记
                        window.isProgrammaticScroll = false;
                    }
                }

                // 更新URL hash
                history.pushState(null, null, targetId);

                // 更新活动链接（桌面端）
                const desktopNavLinks = document.querySelectorAll('.desktop-nav a');
                desktopNavLinks.forEach(link => link.classList.remove('active'));
                const correspondingDesktopLink = document.querySelector(`.desktop-nav a[href="${targetId}"]`);
                if (correspondingDesktopLink) {
                    correspondingDesktopLink.classList.add('active');
                }
            }
        });
    });

    // 点击页面其他地方关闭菜单
    document.addEventListener('click', function(e) {
        if (!mobileMenuToggle.contains(e.target) && !mobileNav.contains(e.target)) {
            const icon = mobileMenuToggle.querySelector('i');
            mobileMenuToggle.classList.remove('active');
            mobileNav.classList.remove('active');
            mobileNavOverlay.classList.remove('active');
            document.body.classList.remove('mobile-menu-open');
            icon.className = 'fas fa-bars';
        }
    });

    // 点击遮罩层关闭菜单
    mobileNavOverlay.addEventListener('click', function() {
        const icon = mobileMenuToggle.querySelector('i');
        mobileMenuToggle.classList.remove('active');
        mobileNav.classList.remove('active');
        mobileNavOverlay.classList.remove('active');
        document.body.classList.remove('mobile-menu-open');
        icon.className = 'fas fa-bars';
    });
}

// 禁用包含"Under Review"的条目的链接（标题和 pub-links）
function disableUnderReviewLinks() {
    document.querySelectorAll('.publication-item').forEach(item => {
        const hasUnderReview = item.querySelector('.venue-rank')?.textContent.trim().toLowerCase() === 'under review';
        if (!hasUnderReview) return;
        // 标题链接
        const titleLink = item.querySelector('.pub-content h3 a');
        if (titleLink) {
            titleLink.classList.add('link-disabled');
            titleLink.removeAttribute('href');
            titleLink.removeAttribute('target');
        }
        // pub-links 内的链接
        item.querySelectorAll('.pub-links a').forEach(a => {
            a.classList.add('link-disabled');
            a.removeAttribute('href');
            a.removeAttribute('target');
        });
    });
}

// Publications 初始化 - 显示所有文章和年份标题
function setupPublicationsFilter() {
    const publicationsList = document.querySelector('.publications-list');
    const filterButtons = document.querySelectorAll('.year-filter-btn');

    if (!publicationsList || filterButtons.length === 0) return;

    // 按年份整块筛选（每块内含 <ol>，序号由 HTML 列表自动生成）
    const yearSections = Array.from(publicationsList.querySelectorAll('.year-section'));

    function filterByYear(year) {
        var i;
        var sec;
        var sy;
        if (year === 'all') {
            for (i = 0; i < yearSections.length; i++) {
                sec = yearSections[i];
                sec.style.display = '';
                sec.classList.remove('year-hidden');
            }
        } else {
            for (i = 0; i < yearSections.length; i++) {
                sec = yearSections[i];
                sy = sec.getAttribute('data-year');
                if (sy === year) {
                    sec.style.display = '';
                    sec.classList.remove('year-hidden');
                } else {
                    sec.style.display = 'none';
                    sec.classList.add('year-hidden');
                }
            }
        }
    }

    // 为每个按钮添加点击事件 - 立即执行，无延迟
    filterButtons.forEach(function(button) {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const year = this.getAttribute('data-year');

            // 立即更新按钮状态
            filterButtons.forEach(function(btn) {
                btn.classList.remove('active');
            });
            this.classList.add('active');

            // 立即执行筛选，同步操作确保无延迟
            filterByYear(year);
        }, false);
    });

    // 初始化：显示所有文章
    filterByYear('all');
}


// 邮件图标复制功能
function setupEmailCopy() {
    const emailIcon = document.getElementById('emailIcon');
    const emailCopyToast = document.getElementById('emailCopyToast');
    const emailTooltip = emailIcon ? emailIcon.querySelector('.social-icon-tooltip') : null;
    if (!emailIcon || !emailCopyToast) return;

    const emailAddress = 'yangyang@mail.scuec.edu.cn';

    emailIcon.addEventListener('click', function(e) {
        e.preventDefault();
        
        // 复制邮件地址到剪贴板
        navigator.clipboard.writeText(emailAddress).then(() => {
            // 隐藏悬浮提示（如果显示）
            if (emailTooltip) {
                emailTooltip.style.opacity = '0';
                emailTooltip.style.visibility = 'hidden';
            }
            // 显示复制成功的提示消息
            emailCopyToast.classList.add('show');
            
            // 2秒后隐藏提示
            setTimeout(() => {
                emailCopyToast.classList.remove('show');
            }, 2000);
        }).catch(err => {
            // 备用方案：使用传统方法
            const textArea = document.createElement('textarea');
            textArea.value = emailAddress;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                // 隐藏悬浮提示（如果显示）
                if (emailTooltip) {
                    emailTooltip.style.opacity = '0';
                    emailTooltip.style.visibility = 'hidden';
                }
                // 显示复制成功的提示消息
                emailCopyToast.classList.add('show');
                
                // 2秒后隐藏提示
                setTimeout(() => {
                    emailCopyToast.classList.remove('show');
                }, 2000);
            } catch (err) {

            }
            document.body.removeChild(textArea);
        });
    });
}



document.addEventListener('DOMContentLoaded', function () {
    // 设置当前年份
    const currentYearElement = document.getElementById('current-year');
    if (currentYearElement) {
        currentYearElement.textContent = new Date().getFullYear();
    }
    
    updateDeployTime();
    setupSmoothScrolling();
    setupMobileMenu();
    disableUnderReviewLinks();
    setupPublicationsFilter();
    setupEmailCopy(); // 初始化邮件复制功能

    // 处理浏览器后退/前进按钮
    window.addEventListener('popstate', function() {
        // 标记为程序性滚动
        window.isProgrammaticScroll = true;

        if (window.location.hash) {
            const targetElement = document.querySelector(window.location.hash);
            if (targetElement) {
                const nav = document.querySelector('.top-nav');
                const navHeight = nav ? nav.offsetHeight : 70;
                const targetTop = targetElement.getBoundingClientRect().top + window.pageYOffset;
                const scrollPosition = targetTop - navHeight - 10;

                window.scrollTo({
                    top: scrollPosition,
                    behavior: 'smooth'
                });
                // 立即保存目标滚动位置
                sessionStorage.setItem('scrollPosition', scrollPosition.toString());
                // 程序性滚动完成后，延迟清除标记（给滚动动画时间）
                setTimeout(function() {
                    window.isProgrammaticScroll = false;
                }, 300);
            } else {
                window.isProgrammaticScroll = false;
            }
        } else {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
            // 立即保存滚动位置
            sessionStorage.setItem('scrollPosition', '0');
            // 程序性滚动完成后，延迟清除标记（给滚动动画时间）
            setTimeout(function() {
                window.isProgrammaticScroll = false;
            }, 300);
        }
    });
});
// 回到顶部按钮功能
document.addEventListener('DOMContentLoaded', function () {
    const backToTopButton = document.getElementById('backToTop');

    if (!backToTopButton) return;

    // 滚动监听已合并到统一处理器中

    // 点击事件 - 优化：减少延迟，使用更快的滚动
    backToTopButton.addEventListener('click', function () {
        // 标记为程序性滚动
        window.isProgrammaticScroll = true;

        // 使用 instant 滚动，立即跳转，避免卡顿
        window.scrollTo({
            top: 0,
            behavior: 'auto'
        });

        // 立即保存滚动位置
        sessionStorage.setItem('scrollPosition', '0');

        // 快速清除标记
        setTimeout(function() {
            window.isProgrammaticScroll = false;
        }, 200);
    });
});





