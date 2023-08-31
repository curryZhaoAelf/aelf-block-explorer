import { useState } from 'react';
// interface IParams {
//   page: number;
//   pageSize: number;
//   [propName: string]: any;
// }

interface IFetchDataItems<T> {
  total: number;
  list: T[];
}

interface IFetchData<U> {
  (IParams): Promise<U>;
}

interface IDisposeData<T, U> {
  (value: Awaited<U>): IFetchDataItems<T>;
}

interface TableDataProps<T, U> {
  defaultPageSize?: number;
  fetchData: IFetchData<U>;
  SSRData: IFetchDataItems<T>;
  filterParams?: object;
  disposeData?: IDisposeData<T, U>;
}

export default function useTableData<T, U>({
  defaultPageSize = 25,
  fetchData,
  SSRData,
  filterParams,
  disposeData,
}: TableDataProps<T, U>) {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(defaultPageSize);
  const [loading, setLoading] = useState<boolean>(false);
  const [total, setTotal] = useState<number>(SSRData.total);
  const [data, setData] = useState<T[]>(SSRData.list);
  const getData = async (params) => {
    setLoading(true);
    try {
      const res = await fetchData({ ...params, ...filterParams });
      if (disposeData) {
        const result = disposeData(res);
        setData(result.list);
        setTotal(result.total);
      } else {
        const result = res as IFetchDataItems<T>;
        setData(result.list);
        setTotal(result.total);
      }
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };
  const pageChange = async (page: number) => {
    setCurrentPage(page);
    getData({ page, pageSize: pageSize });
  };

  const pageSizeChange = async (size) => {
    setPageSize(size);
    setCurrentPage(1);
    getData({ page: 1, pageSize: size });
  };

  return { loading, total, data, currentPage, pageSize, pageChange, pageSizeChange };
}
