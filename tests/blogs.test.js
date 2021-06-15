const Page = require('./helpers/page');

let page;

beforeEach(async () => {
    page = await Page.build();
    await page.goto('http://localhost:3000');
});

afterEach(async () => {
    await page.close();
});

describe('When logged in', () => {
    beforeEach(async () => {
        await page.login();
        await page.click('a.btn-floating');
    });

    test('After login, blogs list should appear', async () => {
        const label = await page.getContentsOf('form label');
        expect(label).toEqual('Blog Title');
    });

    describe('And using valid inputs', async () => {
        beforeEach(async() => {
            await page.type('.title input', 'My Title');
            await page.type('.content input', 'My Content');
            await page.click('form button');
        });

        test('Submittimg takes user to review screen', async () => {
            const text = await page.getContentsOf('h5');

            expect(text).toEqual('Please confirm your entries');
        });

        test('Submitting then saving adds blog to index page', async () => {
            await page.click('button.green');
            await page.waitFor('.card');

            const title = await page.getContentsOf('.card-title');
            const content = await page.getContentsOf('p');

            expect(title).toEqual('My Title');
            expect(content).toEqual('My Content');
        });
    });

    describe('And using invalid inputs', async () => {
        beforeEach(async () => {
            await page.click('form button');
        });

        test('the form shows an error message', async () => {
            const title = await page.getContentsOf('.title .red-text');
            const content = await page.getContentsOf('.content .red-text');

            expect(title).toEqual('You must provide a value');
            expect(content).toEqual('You must provide a value');
        });
    });
});

describe('When user is not logged in', async () => {
    const actions = [
        {
            method: 'GET',
            path: '/api/blogs'
        },
        {
            method: 'POST',
            path: '/api/blogs',
            data: { title: "T", content: "C" }
        }
    ];

    test('Blog actions are prohibited', async () => {
        const results = await page.execTests(actions);

        for (let result of results)
            expect(result.error).toEqual('You must log in!');
    });
});