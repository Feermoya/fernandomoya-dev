export type ProjectWindowData = {
  name: string;
  domain: string;
  imageSrc: string;
  imageSrcSet?: string;
  imageWidth: number;
  imageHeight: number;
  alt: string;
  priority?: boolean;
};

type Props = ProjectWindowData & {
  className?: string;
};

export default function ProjectWindow({
  name,
  domain,
  imageSrc,
  imageSrcSet,
  imageWidth,
  imageHeight,
  alt,
  priority = false,
  className = '',
}: Props) {
  return (
    <figure className={`hero-project-window ${className}`.trim()}>
      <div className="hero-project-window__chrome" aria-hidden="true">
        <span className="hero-project-window__dots">
          <span />
          <span />
          <span />
        </span>
        <span className="hero-project-window__meta">
          <span className="hero-project-window__name">{name}</span>
          <span className="hero-project-window__sep" aria-hidden="true">
            ·
          </span>
          <span className="hero-project-window__domain">{domain}</span>
        </span>
      </div>
      <div className="hero-project-window__viewport">
        <img
          src={imageSrc}
          srcSet={imageSrcSet}
          alt={alt}
          width={imageWidth}
          height={imageHeight}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding={priority ? 'async' : 'async'}
          sizes="(min-width: 1280px) 34rem, (min-width: 1024px) 42vw, 88vw"
          className="hero-project-window__image"
        />
      </div>
    </figure>
  );
}
