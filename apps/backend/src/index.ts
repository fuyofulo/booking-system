import express from 'express';
import { userRouter } from './router/user';
import { restaurantRouter } from './router/restaurants';
import { roleRouter } from './router/roles';
import { restaurantUserRouter } from './router/restaurantUser';
import { tablesRouter } from './router/tables';
import { timeslotRouter } from './router/timeslot';
import { bookingsRouter } from './router/bookings';
import { generalRouter } from './router/general';

const app = express();
app.use(express.json());

app.listen(7000);

app.get('/', (req, res) => {
    res.json({
        message: "welcome to backend"
    })
})

app.use('/api/v1/user', userRouter);
app.use('/api/v1/restaurant', restaurantRouter);
app.use('/api/v1/role', roleRouter); 
app.use('/api/v1/restaurantUser', restaurantUserRouter); 
app.use('/api/v1/tables', tablesRouter); 
app.use('/api/v1/timeslot', timeslotRouter); 
app.use('/api/v1/bookings', bookingsRouter); 
app.use('/api/v1/general', generalRouter); 