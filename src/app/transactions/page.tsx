/*
 * @author: Peterbjx
 * @Date: 2023-08-15 15:58:11
 * @LastEditors: Peterbjx
 * @LastEditTime: 2023-08-15 16:36:16
 * @Description: transactions
 */

import TransactionsList from './list';
import fetchData from './mock';
export default async function BlocksPage() {
  const data = await fetchData({ page: 1, pageSize: 25 });
  return <TransactionsList SSRData={data} />;
}
