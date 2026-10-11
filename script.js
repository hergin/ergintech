(function () {
    'use strict';

    // Mobile menu
    var toggle = document.querySelector('.nav-toggle');
    var links = document.getElementById('nav-links');
    if (toggle && links) {
        toggle.addEventListener('click', function () {
            var open = links.classList.toggle('open');
            toggle.setAttribute('aria-expanded', String(open));
        });
        links.addEventListener('click', function (e) {
            if (e.target.closest('a')) {
                links.classList.remove('open');
                toggle.setAttribute('aria-expanded', 'false');
            }
        });
    }

    // Hero illustration: the same orders run through two lanes at once.
    // In "today" the middle step is slow, so orders pile up in front of it.
    var svg = document.getElementById('sim');
    if (!svg) return;

    var NS = 'http://www.w3.org/2000/svg';
    var STATIONS = [110, 205, 300];
    var START = 14, END = 386, SPEED = 130, GAP = 18, SIZE = 13, ARRIVAL = 0.7;
    var RUN = 24, HOLD = 3.5;

    function lane(key, y, service) {
        return {
            y: y,
            service: service,
            layer: document.getElementById('sim-items-' + key),
            countEl: document.getElementById('sim-count-' + key),
            items: [], // front of the line first
            finished: 0,
            spawnClock: 0
        };
    }

    var lanes = [
        lane('today', 62, [0.3, 1.5, 0.3]),
        lane('optimized', 176, [0.3, 0.3, 0.3])
    ];
    var clock = 0;

    function addItem(ln) {
        var el = document.createElementNS(NS, 'rect');
        el.setAttribute('class', 'item');
        el.setAttribute('width', SIZE);
        el.setAttribute('height', SIZE);
        el.setAttribute('rx', 3);
        el.setAttribute('y', ln.y - SIZE / 2);
        ln.layer.appendChild(el);
        ln.items.push({ x: START, stage: 0, serving: 0, blocked: false, el: el });
    }

    function stepLane(ln, dt) {
        var items = ln.items;
        for (var i = 0; i < items.length; i++) {
            var it = items[i];
            if (it.serving > 0) {
                it.serving -= dt;
                if (it.serving <= 0) {
                    it.serving = 0;
                    it.stage++;
                }
                it.blocked = false;
                continue;
            }
            var limit = i > 0 ? items[i - 1].x - GAP : Infinity;
            var stop = it.stage < STATIONS.length ? STATIONS[it.stage] : Infinity;
            var free = it.x + SPEED * dt;
            it.blocked = limit < free && limit < stop;
            it.x = Math.max(it.x, Math.min(free, stop, limit));
            if (it.x >= stop) it.serving = ln.service[it.stage];
        }
        while (items.length && items[0].x >= END) {
            items.shift().el.remove();
            ln.finished++;
        }
        ln.spawnClock += dt;
        if (ln.spawnClock >= ARRIVAL) {
            var rear = items[items.length - 1];
            if (!rear || rear.x - GAP >= START) {
                addItem(ln);
                ln.spawnClock = 0;
            } else {
                ln.spawnClock = ARRIVAL;
            }
        }
    }

    function render() {
        for (var l = 0; l < lanes.length; l++) {
            var ln = lanes[l];
            for (var i = 0; i < ln.items.length; i++) {
                var it = ln.items[i];
                it.el.setAttribute('x', (it.x - SIZE / 2).toFixed(1));
                it.el.setAttribute('class', it.blocked ? 'item blocked' : 'item');
            }
            var count = String(ln.finished);
            if (ln.countEl.textContent !== count) ln.countEl.textContent = count;
        }
    }

    function advance(dt) {
        clock += dt;
        if (clock < RUN) {
            stepLane(lanes[0], dt);
            stepLane(lanes[1], dt);
        } else if (clock >= RUN + HOLD) {
            restart();
        }
        svg.classList.toggle('done', clock >= RUN);
    }

    function restart() {
        clock = 0;
        for (var l = 0; l < lanes.length; l++) {
            var ln = lanes[l];
            while (ln.items.length) ln.items.pop().el.remove();
            ln.finished = 0;
            ln.spawnClock = ARRIVAL;
        }
    }

    function run(seconds) {
        for (var t = 0; t < seconds; t += 0.02) advance(0.02);
    }

    restart();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        // No animation: show how both lanes look at the end of a run.
        run(RUN);
        render();
        return;
    }
    run(2.5);
    render();

    var visible = true;
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
            visible = entries[0].isIntersecting;
        }).observe(svg);
    }

    var last = null;
    function frame(now) {
        if (last !== null && visible) {
            advance(Math.min((now - last) / 1000, 0.05));
            render();
        }
        last = now;
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
})();
