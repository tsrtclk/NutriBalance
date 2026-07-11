import { Injectable, NotFoundException } from "@nestjs/common";
import { EventBusService } from "@platform/events";
import type { GeoJsonPoint } from "@platform/shared-types";

import { PlacesRepository } from "./places.repository";
import type { PlaceResponseDto } from "./dto/place-response.dto";

@Injectable()
export class PlacesService {
  constructor(
    private readonly repo: PlacesRepository,
    private readonly events: EventBusService,
  ) {}

  async create(
    ownerId: string,
    name: string,
    location: GeoJsonPoint,
  ): Promise<PlaceResponseDto> {
    const place = await this.repo.create(ownerId, name, location);
    // Emit a domain event for notable writes (consumers: analytics, notifications).
    await this.events.publish("example.created", {
      id: place.id,
      owner_id: ownerId,
      name,
    });
    return place;
  }

  nearby(
    lat: number,
    lng: number,
    radiusKm: number,
  ): Promise<PlaceResponseDto[]> {
    return this.repo.findNear(lat, lng, radiusKm);
  }

  async findOne(id: string): Promise<PlaceResponseDto> {
    const place = await this.repo.findOne(id);
    if (!place)
      throw new NotFoundException({
        code: "PLACE_NOT_FOUND",
        message: "Place not found",
      });
    return place;
  }
}
