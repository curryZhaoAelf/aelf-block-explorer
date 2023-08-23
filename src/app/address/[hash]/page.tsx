import Detail from '@_components/AddressDetail';
import { TitleEnum } from '@_types/commenDetail';
import fetchData from './mock';
export default async function AddressDetails({ params }: { params: HashParams }) {
  const data = await fetchData({ address: params.hash });
  return (
    <Detail SSRData={data} title={data.contractName ? TitleEnum.Contract : TitleEnum.Address} hash={params.hash} />
  );
}
