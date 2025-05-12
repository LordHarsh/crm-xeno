import { Router } from 'express';
import authenticateToken from '../../shared/middlewares/authenticate';
import { createCustomer, deleteCustomer, getCustomerById, getCustomers, updateCustomer } from './customers.controller';


export default (): Router => {
    const app = Router();
    app.get('/', authenticateToken(), getCustomers);
    app.get('/:id', authenticateToken(), getCustomerById);
    app.post('/', authenticateToken(), createCustomer);
    app.put('/:id', authenticateToken(), updateCustomer);
    app.delete('/:id', authenticateToken(), deleteCustomer);
    return app;
};
