import Image from "next/image";

type KnowledgeVisualProps = {
  imageSrc?: string | null;
  imageAlt?: string;
  className?: string;
};

export function KnowledgeVisual({ imageSrc, imageAlt = "", className = "" }: KnowledgeVisualProps) {
  return (
    <div className={`knowledge-visual ${imageSrc ? "knowledge-visual-image" : "knowledge-visual-fallback"} ${className}`.trim()}>
      {imageSrc ? (
        <Image src={imageSrc} alt={imageAlt} fill sizes="(max-width: 767px) 100vw, 50vw" />
      ) : (
        <Image src="/brand/mapa-dobra-logo.svg" alt="" width={210} height={48} className="knowledge-visual-logo" />
      )}
    </div>
  );
}
