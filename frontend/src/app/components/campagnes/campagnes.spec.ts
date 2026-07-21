import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Campagnes } from './campagnes';

describe('Campagnes', () => {
  let component: Campagnes;
  let fixture: ComponentFixture<Campagnes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Campagnes],
    }).compileComponents();

    fixture = TestBed.createComponent(Campagnes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
