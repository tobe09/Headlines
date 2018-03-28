class MyServiceWorker {
    constructor() {
    }
    _updateReady(worker) {
        worker.postMessage({ 'key': 'skipWaiting' });
    }
    _trackInstalling(worker) {
        worker.addEventListener('statechange', () => {
            if (worker.state === 'installed') {
                this._updateReady(worker);
            }
        });
    }
    regServiceWorker() {
        if (!navigator.serviceWorker) return

        navigator.serviceWorker.register('/sw.js').then(reg => {
            if (!navigator.serviceWorker.controller) return     //not loaded via a new service worker

            if (reg.waiting) {
                this._updateReady(reg.waiting);
            }

            if (reg.installing) {
                this._trackInstalling(reg.installing);
            }

            reg.addEventListener('updatefound', () => {
                this._trackInstalling(reg.installing);
                return;
            });

            console.log('Registration successful');

        }).catch(err => {
            console.log('Registration failed');
        });

        navigator.serviceWorker.addEventListener('controllerchange', () => {
            window.location.reload(true);
        });
    }
}

let mySw = new MyServiceWorker();
mySw.regServiceWorker();