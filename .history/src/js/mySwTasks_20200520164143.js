class MyServiceWorker {

    regServiceWorker() {
        if (!navigator.serviceWorker) return

        navigator.serviceWorker.register('/sw.js').then(reg => {
            if (!navigator.serviceWorker.controller) return     //not loaded via a new service worker

            debugger
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
    
    _updateReady(worker) {
        $('.update-sw').css('display', 'block');
        $('#btnYes').on('click', function () {
            $('.update-sw').css('display', 'none');
            worker.postMessage({ 'key': 'skipWaiting' });
        })
        $('#btnNo').on('click', function () {
            $('.update-sw').css('display', 'none');
        })
    }

    _trackInstalling(worker) {
        worker.addEventListener('statechange', () => {
            if (worker.state === 'installed') {
                this._updateReady(worker);
            }
        });
    }
}

let mySw = new MyServiceWorker();
mySw.regServiceWorker();