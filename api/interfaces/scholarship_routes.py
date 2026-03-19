from urllib.parse import quote_plus, urlparse

from flask import Blueprint, jsonify, request

scholarship_routes = Blueprint('scholarship_routes', __name__, url_prefix='/api/scholarships')

NATIONAL_SCHOLARSHIPS = [
    {
        'id': 'fafsa',
        'name': 'FAFSA',
        'provider': 'Federal Student Aid',
        'amount': 'Varies',
        'deadline': 'Federal deadline varies yearly',
        'description': 'Required application for most federal, state, and institutional financial aid.',
        'eligibility': 'U.S. citizens and eligible non-citizens',
        'tags': ['financial-aid', 'federal', 'need-based'],
        'apply_url': 'https://studentaid.gov/h/apply-for-aid/fafsa',
    },
    {
        'id': 'pell-grant',
        'name': 'Federal Pell Grant',
        'provider': 'Federal Student Aid',
        'amount': 'Up to federal maximum',
        'deadline': 'Submit FAFSA first',
        'description': 'Need-based federal grant for undergraduate students.',
        'eligibility': 'Undergraduate students with demonstrated financial need',
        'tags': ['financial-aid', 'grant', 'need-based'],
        'apply_url': 'https://studentaid.gov/understand-aid/types/grants/pell',
    },
    {
        'id': 'coca-cola-scholars',
        'name': 'Coca-Cola Scholars Program',
        'provider': 'Coca-Cola Scholars Foundation',
        'amount': '$20,000',
        'deadline': 'Fall (annual)',
        'description': 'Merit scholarship for high-achieving high school seniors with leadership and service.',
        'eligibility': 'High school seniors in the U.S.',
        'tags': ['scholarship', 'merit', 'leadership'],
        'apply_url': 'https://www.coca-colascholarsfoundation.org/apply/',
    },
    {
        'id': 'gates-scholarship',
        'name': 'The Gates Scholarship',
        'provider': 'The Gates Scholarship',
        'amount': 'Full cost not covered by other aid',
        'deadline': 'Fall (annual)',
        'description': 'Highly selective scholarship for exceptional minority high school seniors with financial need.',
        'eligibility': 'Pell-eligible high school seniors meeting program criteria',
        'tags': ['scholarship', 'need-based', 'merit'],
        'apply_url': 'https://www.thegatesscholarship.org/scholarship',
    },
    {
        'id': 'jack-kent-cooke',
        'name': 'Cooke College Scholarship',
        'provider': 'Jack Kent Cooke Foundation',
        'amount': 'Up to $55,000 per year',
        'deadline': 'Varies (annual)',
        'description': 'Scholarship for high-achieving students with financial need.',
        'eligibility': 'High school seniors with strong academics and financial need',
        'tags': ['scholarship', 'need-based', 'academic'],
        'apply_url': 'https://www.jkcf.org/our-scholarships/college-scholarship-program/',
    },
]

STATE_AID_LINKS = {
    'AZ': {
        'name': 'Arizona Student Financial Aid Programs',
        'provider': 'Arizona Commission for Postsecondary Education',
        'apply_url': 'https://www.azed.gov/finance/federal-grants',
    },
    'CA': {
        'name': 'California Student Aid Commission Programs',
        'provider': 'California Student Aid Commission',
        'apply_url': 'https://www.csac.ca.gov/',
    },
    'FL': {
        'name': 'Florida Student Scholarship and Grant Programs',
        'provider': 'Florida Department of Education',
        'apply_url': 'https://www.floridastudentfinancialaidsg.org/',
    },
    'NY': {
        'name': 'New York State Aid Programs',
        'provider': 'HESC',
        'apply_url': 'https://www.hesc.ny.gov/',
    },
    'TX': {
        'name': 'Texas College for All Aid Resources',
        'provider': 'THECB',
        'apply_url': 'https://www.texascollege.edu/paying-for-college',
    },
}


def _normalize_school_url(url: str | None) -> str | None:
    if not url:
        return None

    clean = url.strip()
    if not clean:
        return None

    if clean.startswith('http://') or clean.startswith('https://'):
        return clean

    return f'https://{clean}'


def _join_url(base_url: str, path: str) -> str:
    return f"{base_url.rstrip('/')}/{path.lstrip('/')}"


def _build_school_resource_urls(school_name: str, school_url: str | None) -> dict[str, str | None]:
    query_name = school_name.strip() or 'college'

    if not school_url:
        scholarship_search_url = f"https://www.google.com/search?q={quote_plus(f'{query_name} scholarships')}"
        aid_search_url = f"https://www.google.com/search?q={quote_plus(f'{query_name} financial aid')}"
        return {
            'school_website_url': None,
            'school_scholarship_page_url': scholarship_search_url,
            'school_financial_aid_page_url': aid_search_url,
            'school_scholarship_direct_url': None,
            'school_financial_aid_direct_url': None,
        }

    parsed = urlparse(school_url)
    domain = parsed.netloc or parsed.path
    scholarship_query = f'{query_name} scholarships site:{domain}' if domain else f'{query_name} scholarships'
    aid_query = f'{query_name} financial aid site:{domain}' if domain else f'{query_name} financial aid'

    scholarship_search_url = f'https://www.google.com/search?q={quote_plus(scholarship_query)}'
    aid_search_url = f'https://www.google.com/search?q={quote_plus(aid_query)}'

    return {
        'school_website_url': school_url,
        'school_scholarship_page_url': scholarship_search_url,
        'school_financial_aid_page_url': aid_search_url,
        'school_scholarship_direct_url': _join_url(school_url, 'admissions/financial-aid-scholarships'),
        'school_financial_aid_direct_url': _join_url(school_url, 'admissions/financial-aid'),
    }


@scholarship_routes.route('/list', methods=['GET'])
def list_scholarships():
    school_name = request.args.get('school_name', '').strip()
    state = request.args.get('state', '').strip().upper()
    school_url = _normalize_school_url(request.args.get('school_url'))
    query = request.args.get('q', '').strip().lower()

    resource_urls = _build_school_resource_urls(school_name, school_url)
    scholarships = list(NATIONAL_SCHOLARSHIPS)

    if school_name:
        scholarships.insert(
            0,
            {
                'id': 'institutional-scholarships',
                'name': f'{school_name} Institutional Scholarships',
                'provider': school_name,
                'amount': 'Varies',
                'deadline': 'Varies by school/program',
                'description': 'School-specific scholarships, grants, and merit opportunities.',
                'eligibility': 'Depends on institution requirements',
                'tags': ['scholarship', 'institutional'],
                'apply_url': resource_urls['school_scholarship_page_url'] or school_url or 'https://studentaid.gov/',
            },
        )

    if state in STATE_AID_LINKS:
        state_link = STATE_AID_LINKS[state]
        scholarships.append(
            {
                'id': f"state-aid-{state.lower()}",
                'name': state_link['name'],
                'provider': state_link['provider'],
                'amount': 'Varies by state program',
                'deadline': 'Varies',
                'description': 'Official state-level grants and scholarships.',
                'eligibility': f'State residents ({state})',
                'tags': ['state-aid', 'grant', 'scholarship'],
                'apply_url': state_link['apply_url'],
            }
        )

    if query:
        scholarships = [
            item
            for item in scholarships
            if query in item['name'].lower()
            or query in item['provider'].lower()
            or query in item['description'].lower()
            or any(query in tag.lower() for tag in item.get('tags', []))
        ]

    return jsonify({'scholarships': scholarships, 'resources': resource_urls})
