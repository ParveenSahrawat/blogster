const puppeteer = require('puppeteer');
const sessionFactory = require('../factories/sessionFactory');
const userFactory = require('../factories/userFactory');

class CustomPage {
    static async build() {
        const browser = await puppeteer.launch({
            headless: false // means without any graphical user interface
        });

        const page = await browser.newPage();
        const customPage = new CustomPage(page);

        return new Proxy(customPage, {
            get: function (target, property) {
                return customPage[property] || browser[property] || page[property];
            }
        });
    }

    constructor(page) {
        this.page = page;
    }

    async login() {
        const user = await userFactory();
        const { session, sig } = sessionFactory(user);

        await this.page.setCookie({ name: 'session', value: session });
        await this.page.setCookie({ name: 'session.sig', value: sig });
        await this.page.goto('http://localhost:3000/blogs');
        await this.page.waitFor('a[href="/auth/logout"]');
    }

    async getContentsOf(selector) {
        return this.page.$eval(selector, el => el.innerHTML);
    }

    execute(options) {
        return this.page.evaluate((_options) => {
            const { path, data, method } = _options;
            return fetch(`${path}`, {
                method,
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: method !== 'GET' ? JSON.stringify(data) : null
            }).then(res => res.json());
        }, options);
    }

    execTests(actions) {
        return Promise.all(actions.map((action) => {
            return this.execute(action);
        }));
    }
}

module.exports = CustomPage;