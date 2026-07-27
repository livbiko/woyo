import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { slugify } from '../common/slugify';
import { CreateBusinessDto } from './dto/create-business.dto';
import { SearchBusinessesDto } from './dto/search-businesses.dto';

const BUSINESS_SUMMARY_INCLUDE = {
  category: true,
  city: true,
  images: { orderBy: { order: 'asc' as const }, take: 1 },
  reviews: { select: { rating: true } },
} as const;

function withRatingSummary<T extends { reviews: { rating: number }[] }>(business: T) {
  const { reviews, ...rest } = business;
  const reviewCount = reviews.length;
  const averageRating =
    reviewCount === 0 ? 0 : Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviewCount) * 10) / 10;
  return { ...rest, reviewCount, averageRating };
}

@Injectable()
export class BusinessesService {
  constructor(private readonly prisma: PrismaService) {}

  async search(filters: SearchBusinessesDto) {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;

    const where = {
      status: 'APPROVED' as const,
      ...(filters.category ? { category: { slug: filters.category } } : {}),
      ...(filters.city ? { city: { slug: filters.city } } : {}),
      ...(filters.verifiedOnly ? { isVerified: true } : {}),
      ...(filters.q
        ? {
            OR: [
              { name: { contains: filters.q, mode: 'insensitive' as const } },
              { shortDescription: { contains: filters.q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.business.findMany({
        where,
        include: BUSINESS_SUMMARY_INCLUDE,
        orderBy: [{ isVerified: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.business.count({ where }),
    ]);

    return {
      items: items.map(withRatingSummary),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findBySlug(slug: string) {
    const business = await this.prisma.business.findUnique({
      where: { slug },
      include: {
        category: true,
        city: true,
        images: { orderBy: { order: 'asc' } },
        openingHours: true,
        services: true,
        reviews: { include: { user: { select: { name: true } } }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!business || business.status !== 'APPROVED') {
      throw new NotFoundException('Business not found');
    }
    const reviewCount = business.reviews.length;
    const averageRating =
      reviewCount === 0
        ? 0
        : Math.round((business.reviews.reduce((s, r) => s + r.rating, 0) / reviewCount) * 10) / 10;
    return { ...business, reviewCount, averageRating };
  }

  async create(dto: CreateBusinessDto, ownerId: string) {
    const category = await this.prisma.category.findUnique({ where: { slug: dto.categorySlug } });
    if (!category) throw new BadRequestException(`Unknown category: ${dto.categorySlug}`);

    const city = await this.prisma.city.findUnique({ where: { slug: dto.citySlug } });
    if (!city) throw new BadRequestException(`Unknown city: ${dto.citySlug}`);

    const baseSlug = slugify(dto.name);
    let slug = baseSlug;
    let suffix = 1;
    while (await this.prisma.business.findUnique({ where: { slug } })) {
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }

    return this.prisma.business.create({
      data: {
        slug,
        name: dto.name,
        ownerId,
        categoryId: category.id,
        cityId: city.id,
        shortDescription: dto.shortDescription,
        description: dto.description,
        address: dto.address,
        phone: dto.phone,
        whatsapp: dto.whatsapp,
        email: dto.email,
        website: dto.website,
        status: 'PENDING',
      },
    });
  }
}
