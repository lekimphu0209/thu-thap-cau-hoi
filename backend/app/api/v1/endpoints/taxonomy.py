from fastapi import APIRouter

from app.api.deps import ActiveUser, AdminUser, CatalogServiceDep, TaxonomyServiceDep
from app.schemas.taxonomy import GroupOut, LookupOptionOut, SubgroupOut, UpdateSubgroupRequest

router = APIRouter(tags=["Taxonomy"])


@router.get("/taxonomy/groups", response_model=list[GroupOut], summary="List groups + subgroups")
async def list_groups(
    taxonomy_service: TaxonomyServiceDep, current_user: ActiveUser
) -> list[GroupOut]:
    groups = await taxonomy_service.list_groups_with_subgroups()
    progress = await taxonomy_service.get_progress_counts(current_user.user_id)

    result: list[GroupOut] = []
    for group in groups:
        subgroup_outs = []
        for subgroup in group.subgroups:
            subgroup_out = SubgroupOut.model_validate(subgroup)
            subgroup_out.done_count = progress.get(subgroup.subgroup_id, 0)
            subgroup_outs.append(subgroup_out)
        group_out = GroupOut.model_validate(group)
        group_out.subgroups = subgroup_outs
        result.append(group_out)
    return result


@router.get(
    "/taxonomy/expected-behaviors",
    response_model=list[LookupOptionOut],
    summary="List expected_behavior options",
)
async def list_expected_behaviors(
    taxonomy_service: TaxonomyServiceDep, _: ActiveUser
) -> list[LookupOptionOut]:
    options = await taxonomy_service.list_expected_behaviors()
    return [LookupOptionOut.model_validate(option) for option in options]


@router.get(
    "/taxonomy/review-statuses",
    response_model=list[LookupOptionOut],
    summary="List review_status options",
)
async def list_review_statuses(
    taxonomy_service: TaxonomyServiceDep, _: ActiveUser
) -> list[LookupOptionOut]:
    options = await taxonomy_service.list_review_statuses()
    return [LookupOptionOut.model_validate(option) for option in options]


@router.get("/taxonomy/specialties", response_model=list[str], summary="Specialties from guideline library")
async def list_specialties(catalog_service: CatalogServiceDep) -> list[str]:
    return await catalog_service.specialties()


@router.get(
    "/taxonomy/disease-catalog",
    response_model=dict[str, list[str]],
    summary="Diseases grouped by specialty from guideline library",
)
async def get_disease_catalog(catalog_service: CatalogServiceDep, _: ActiveUser) -> dict[str, list[str]]:
    return await catalog_service.diseases_by_specialty()


@router.patch(
    "/admin/subgroups/{subgroup_id}",
    response_model=SubgroupOut,
    summary="Update a subgroup (Admin)",
)
async def update_subgroup(
    subgroup_id: int,
    payload: UpdateSubgroupRequest,
    taxonomy_service: TaxonomyServiceDep,
    _: AdminUser,
) -> SubgroupOut:
    subgroup = await taxonomy_service.update_subgroup(
        subgroup_id,
        name=payload.name,
        purpose=payload.purpose,
        typical_role=payload.typical_role,
        expected_retrieval=payload.expected_retrieval,
        target_count=payload.target_count,
    )
    return SubgroupOut.model_validate(subgroup)
