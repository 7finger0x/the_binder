import Link from "next/link";
import { loadSharedCollection } from "@/lib/cloud";
import { SharedBinderView } from "@/components/shared-binder-view";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function SharedCollectionPage({ params }: Props) {
  const { slug } = await params;
  const result = await loadSharedCollection(slug);
  return <SharedBinderView result={result} />;
}
