const request = require('supertest');
const app = require('../app');
const db = require('../db/db');

describe('Todos API', () => {
    beforeAll(async () => {
        await db.sync({ force: true }); // Re-sync database before running tests
    });

    it('should create a new todo', async () => {
        const response = await request(app)
            .post('/todos')
            .send({
                name: 'Test Todo'
            });
        expect(response.statusCode).toBe(201);
        expect(response.body.name).toBe('Test Todo');
        expect(response.body.done).toBe(false);
    });

    it('should not create a todo with an empty name', async () => {
        const response = await request(app)
            .post('/todos')
            .send({
                name: ''
            });
        expect(response.statusCode).toBe(400);
        expect(response.body.errors[0].msg).toBe('Invalid value');
    });

    it('should get all todos', async () => {
        const response = await request(app).get('/todos');
        expect(response.statusCode).toBe(200);
        expect(response.body.length).toBe(1); // There should be one todo created from the previous test
    });

    it('should mark a todo as done', async () => {
        const todoResponse = await request(app).get('/todos');
        const todoId = todoResponse.body[0].id;

        const response = await request(app)
            .put(`/todos/${todoId}/done`);
        expect(response.statusCode).toBe(200);
        expect(response.body.done).toBe(true);
    });

    it('should mark a todo as undone', async () => {
        const todoResponse = await request(app).get('/todos');
        const todoId = todoResponse.body[0].id;

        const response = await request(app)
            .delete(`/todos/${todoId}/done`);
        expect(response.statusCode).toBe(200);
        expect(response.body.done).toBe(false);
    });

    it('should return 404 for a non-existing todo when marking done', async () => {
        const response = await request(app)
            .put('/todos/999/done'); // Using a non-existent ID
        expect(response.statusCode).toBe(404);
    });

    it('should return 404 for a non-existing todo when marking undone', async () => {
        const response = await request(app)
            .delete('/todos/999/done'); // Using a non-existent ID
        expect(response.statusCode).toBe(404);
    });
});
