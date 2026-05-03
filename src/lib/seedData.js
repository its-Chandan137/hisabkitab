import { DATA_VERSION } from './constants';
import { createId, roundCurrency, toIsoDate } from './utils';

function createTransaction({
  friendId,
  type,
  amount,
  purpose,
  date,
  createdAt,
}) {
  return {
    id: createId('txn'),
    friendId,
    type,
    amount: roundCurrency(amount),
    purpose,
    date: toIsoDate(date),
    createdAt: createdAt || new Date().toISOString(),
  };
}

export function createSeedData() {
  const friendNames = ['Abhishek', 'Manish', 'Shree', 'Shiva', 'Jathilesh'];

  const friends = friendNames.map((name, index) => ({
    id: createId('friend'),
    name,
    createdAt: toIsoDate(`2024-01-${String(index + 1).padStart(2, '0')}`),
  }));

  const friendMap = Object.fromEntries(
    friends.map((friend) => [friend.name, friend]),
  );

  const transactions = [];
  let transactionOrder = 0;

  const pushTransaction = (friendName, type, amount, purpose, date) => {
    transactions.push(
      createTransaction({
        friendId: friendMap[friendName].id,
        type,
        amount,
        purpose,
        date,
        createdAt: new Date(
          new Date(`${date}T12:00:00`).getTime() + transactionOrder * 1000,
        ).toISOString(),
      }),
    );
    transactionOrder += 1;
  };

  pushTransaction('Abhishek', 'given', 670, 'Previous balance', '2024-01-01');
  pushTransaction('Abhishek', 'given', 230, 'Lunch', '2024-01-13');
  pushTransaction('Abhishek', 'given', 130, 'Lunch', '2024-01-16');
  pushTransaction('Abhishek', 'given', 730, 'Party', '2024-01-20');
  pushTransaction('Abhishek', 'given', 180, 'Lunch', '2024-02-05');
  pushTransaction('Abhishek', 'given', 208, 'Lunch', '2024-03-30');

  pushTransaction('Abhishek', 'received', 50, 'Uber', '2024-01-29');
  pushTransaction('Abhishek', 'received', 197, 'Meal', '2024-02-11');
  pushTransaction('Abhishek', 'received', 190, 'Meal', '2024-02-18');
  pushTransaction('Abhishek', 'received', 730, 'Party', '2024-02-27');
  pushTransaction('Abhishek', 'received', 281, 'Lunch', '2024-03-02');
  pushTransaction('Abhishek', 'received', 192, 'Lunch', '2024-03-25');
  pushTransaction('Abhishek', 'received', 220, 'Lunch', '2024-04-24');

  pushTransaction('Manish', 'given', 560, 'Ticket cancel train/trip', '2024-01-01');
  pushTransaction('Manish', 'given', 108, 'Lunch', '2024-03-30');
  pushTransaction('Manish', 'given', 175, 'Lunch', '2024-04-14');
  pushTransaction('Manish', 'given', 225, 'Lunch paratha', '2024-04-23');

  pushTransaction('Manish', 'received', 183, 'Lunch', '2024-03-08');

  const groupId = createId('group');
  const groupName = 'HISAB';

  const groups = [
    {
      id: groupId,
      name: groupName,
      members: [
        { friendId: friendMap.Manish.id },
        { friendId: friendMap.Abhishek.id },
        { friendId: friendMap.Shiva.id },
      ],
      createdAt: toIsoDate('2024-02-27'),
    },
  ];

  const groupExpenses = [
    {
      id: createId('expense'),
      groupId,
      item: 'Bombay Safayer',
      totalAmount: 2490,
      paidBy: 'me',
      splitAmount: roundCurrency(2490 / 4),
      date: toIsoDate('2024-02-27'),
      createdAt: new Date('2024-02-27T13:00:00').toISOString(),
    },
    {
      id: createId('expense'),
      groupId,
      item: 'Blackberry Breezers',
      totalAmount: 260,
      paidBy: 'me',
      splitAmount: roundCurrency(260 / 4),
      date: toIsoDate('2024-02-27'),
      createdAt: new Date('2024-02-27T13:05:00').toISOString(),
    },
    {
      id: createId('expense'),
      groupId,
      item: 'Kings Cig',
      totalAmount: 180,
      paidBy: 'me',
      splitAmount: roundCurrency(180 / 4),
      date: toIsoDate('2024-02-27'),
      createdAt: new Date('2024-02-27T13:10:00').toISOString(),
    },
  ];

  const updatedAt = new Date('2024-04-24T12:00:00').toISOString();

  return {
    version: DATA_VERSION,
    updatedAt,
    friends,
    transactions,
    groups,
    groupExpenses,
    groupPayments: [],
  };
}
