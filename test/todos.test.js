const request = require('supertest');
const app = require('../app');
const db = require('../db/db');

// Seed some data before running tests
beforeAll(async () => {
    await db.sync({ force: true }); // Resyncs the DB
    await db.models.todo.create({ name: 'Initial Task 1', done: false });
    await db.models.todo.create({ name: 'Initial Task 2', done: true });
});

// Clean up after tests
afterAll(async () => {
    await db.close();
});



describe('Todos API', () => {

    test('GET /todos should return all todos', async () => {
        const res = await request(app).get('/todos');
        expect(res.statusCode).toEqual(200);
        expect(res.body.length).toBe(2); // Should have 2 initial tasks
    });

    test('POST /todos should create a new todo', async () => {
        const res = await request(app)
            .post('/todos')
            .send({ name: 'New Task' });
        expect(res.statusCode).toEqual(201);
        expect(res.body.name).toBe('New Task');
        expect(res.body.done).toBe(false);
    });

    test('POST /todos should return validation error for empty name', async () => {
        const res = await request(app)
            .post('/todos')
            .send({ name: '' });
        expect(res.statusCode).toEqual(400);
        expect(res.body.errors[0].msg).toBe('Invalid value');
    });

    test('PUT /todos/:id/done should mark a todo as done', async () => {
        const res = await request(app)
            .put('/todos/1/done');
        expect(res.statusCode).toEqual(200);
        expect(res.body.done).toBe(true);
    });

    test('PUT /todos/:id/done should return 404 for a non-existent todo', async () => {
        const res = await request(app)
            .put('/todos/999/done');
        expect(res.statusCode).toEqual(404);
        expect(res.text).toBe('Todo not found');
    });

    test('DELETE /todos/:id/done should mark a todo as not done', async () => {
        const res = await request(app)
            .delete('/todos/1/done');
        expect(res.statusCode).toEqual(200);
        expect(res.body.done).toBe(false);
    });

    test('Database connection should be established', async () => {
        await expect(db.authenticate()).resolves.not.toThrow();
    });

    test('Database model should sync correctly', async () => {
        const todoModel = db.models.todo;
        expect(todoModel).toBeDefined();
    });

});